#!/usr/bin/env node
'use strict';

const BASE_URL = String(process.env.BASE_URL || 'https://www.stratexanalytics.co.uk').replace(/\/+$/, '');
const API_URL = String(process.env.API_URL || 'https://scoutlink-api.vercel.app').replace(/\/+$/, '');

function fail(message) {
  console.error('FAIL:', message);
  process.exitCode = 1;
}

function pass(message) {
  console.log('PASS:', message);
}

async function text(url) {
  const response = await fetch(url, {
    redirect:'follow',
    headers:{'User-Agent':'StratexShowcaseSocialBlogCheck/1.0'}
  });
  return { response, body:await response.text() };
}

async function json(url) {
  const response = await fetch(url, {
    redirect:'follow',
    cache:'no-store',
    headers:{'User-Agent':'StratexShowcaseSocialBlogCheck/1.0'}
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function main() {
  const showcaseApi = await json(API_URL + '/api/stratex-publishing/showcase-events?_=' + Date.now());
  if (!showcaseApi.response.ok) {
    fail('Showcase publishing API returned ' + showcaseApi.response.status);
  } else {
    const events = showcaseApi.body.data || [];
    const featured = events.find(event => event.featured) || events[0];

    if (!featured) {
      fail('No public Showcase event was returned.');
    } else {
      if (String(featured.eventDate || '').slice(0, 10) !== '2026-10-29') {
        fail('Public Showcase API date is ' + featured.eventDate + ', expected 2026-10-29.');
      } else {
        pass('Public Showcase API date is 29 October 2026.');
      }

      if (!/^11:00/.test(String(featured.playerArrivalTime || ''))) {
        fail('Player arrival is ' + featured.playerArrivalTime + ', expected 11:00.');
      } else {
        pass('Player arrival is 11:00.');
      }

      if (!/^11:00/.test(String(featured.professionalArrivalTime || ''))) {
        fail('Coach/Scout arrival is ' + featured.professionalArrivalTime + ', expected 11:00.');
      } else {
        pass('Coach/Scout arrival is 11:00.');
      }
    }
  }

  const showcasePage = await text(BASE_URL + '/showcase-event');
  if (!showcasePage.response.ok) {
    fail('/showcase-event returned ' + showcasePage.response.status);
  } else {
    pass('/showcase-event loads.');
  }

  const social = await text(BASE_URL + '/images/og/stratex-og.png');
  if (!social.response.ok) {
    fail('Stratex social-share image returned ' + social.response.status);
  } else {
    const type = social.response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) fail('Social-share path is not serving an image.');
    else pass('Stratex social-share image is live.');
  }

  const home = await text(BASE_URL + '/');
  if (!home.response.ok) {
    fail('/ returned ' + home.response.status);
  } else {
    const ogImage = home.body.match(/<meta property="og:image" content="([^"]+)"/i);
    if (!ogImage || !ogImage[1].includes('/images/og/stratex-og.png')) {
      fail('Homepage og:image does not use /images/og/stratex-og.png.');
    } else {
      pass('Homepage uses the Stratex social-share image.');
    }
  }

  const blogs = await json(API_URL + '/api/stratex-website/blog?published=true');
  if (!blogs.response.ok) {
    fail('Published-blog API returned ' + blogs.response.status);
  } else {
    const posts = blogs.body.data || [];
    if (!posts.length) {
      pass('No published blogs exist; homepage Learning section should be removed by the public runtime.');
    } else {
      const latest = posts.slice().sort((a, b) =>
        new Date(b.published_at || b.created_at || 0).getTime() -
        new Date(a.published_at || a.created_at || 0).getTime()
      ).slice(0, 3);

      console.log('Latest published blogs expected on homepage:');
      latest.forEach(post => console.log(' - ' + post.title + ' (' + post.slug + ')'));
      pass('Published blogs are available for the homepage.');
    }
  }

  if (process.exitCode) process.exit(process.exitCode);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

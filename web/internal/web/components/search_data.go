package components

import (
	"encoding/json"
	"log"

	"github.com/lyricapp/lyric/web/internal/web/data"
)

const searchClientJS = `(function() {
  const dataElement = document.getElementById('search-data');
  const payload = JSON.parse(dataElement.textContent || '{}');
  dataElement.remove();

  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  const albums = Array.isArray(payload.albums) ? payload.albums : [];
  const artists = Array.isArray(payload.artists) ? payload.artists : [];
  const languages = Array.isArray(payload.languages) ? payload.languages : [];

  const state = {
    tab: 'tracks',
    query: '',
    languages: new Set(),
    bookmarks: new Set(),
  };

  const refs = {
    queryInput: document.getElementById('search-input'),
    clearButton: document.getElementById('clear-search'),
    languageButtons: Array.from(document.querySelectorAll('[data-lang]')),
    tabButtons: Array.from(document.querySelectorAll('[data-tab]')),
    resultsHeading: document.getElementById('results-heading'),
    resultsCount: document.getElementById('results-count'),
    resultsContainer: document.getElementById('results-container'),
    emptyState: document.getElementById('empty-state'),
    activeFilters: document.getElementById('active-filters'),
  };

  const params = new URLSearchParams(window.location.search);
  const paramTab = params.get('tab');
  if (paramTab && ['tracks', 'albums', 'artists'].includes(paramTab)) {
    state.tab = paramTab;
  }
  const paramQuery = params.get('query');
  if (paramQuery) {
    state.query = paramQuery;
  }
  params.getAll('language').forEach((lang) => {
    if (languages.includes(lang)) {
      state.languages.add(lang);
    }
  });

  const escapeHTML = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  };

  const render = () => {
    refs.queryInput.value = state.query;
    const hasQuery = state.query.trim().length > 0;
    refs.clearButton.classList.toggle('hidden', !hasQuery);

    refs.languageButtons.forEach((button) => {
      const lang = button.getAttribute('data-lang');
      const active = state.languages.has(lang);
      button.classList.toggle('badge-primary', active);
      button.classList.toggle('badge-outline', !active);
      button.setAttribute('aria-pressed', String(active));
    });

    const tabs = ['tracks', 'albums', 'artists'];
    if (!tabs.includes(state.tab)) {
      state.tab = 'tracks';
    }

    refs.tabButtons.forEach((button) => {
      const tab = button.getAttribute('data-tab');
      const isActive = tab === state.tab;
      button.classList.toggle('tab-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    const languageActive = state.languages.size > 0;
    refs.activeFilters.toggleAttribute('hidden', !languageActive);

    const normalizedQuery = state.query.trim().toLowerCase();

    const trackResults = tracks.filter((track) => {
      const matchesQuery = !normalizedQuery ||
        track.title?.toLowerCase().includes(normalizedQuery) ||
        track.artist?.toLowerCase().includes(normalizedQuery) ||
        track.composer?.toLowerCase().includes(normalizedQuery) ||
        track.level?.toLowerCase().includes(normalizedQuery);
      const matchesLanguage = state.languages.size === 0 || !track.language || state.languages.has(track.language);
      return matchesQuery && matchesLanguage;
    });

    const albumResults = normalizedQuery
      ? albums.filter((album) =>
          album.title?.toLowerCase().includes(normalizedQuery) ||
          album.artist?.toLowerCase().includes(normalizedQuery),
        )
      : albums.slice();

    const artistResults = normalizedQuery
      ? artists.filter((artist) => artist.name?.toLowerCase().includes(normalizedQuery))
      : artists.slice();

    let activeResults = [];
    if (state.tab === 'albums') {
      activeResults = albumResults;
    } else if (state.tab === 'artists') {
      activeResults = artistResults;
    } else {
      activeResults = trackResults;
    }

    refs.resultsHeading.textContent = state.tab.charAt(0).toUpperCase() + state.tab.slice(1);
    refs.resultsCount.textContent = String(activeResults.length);

    if (activeResults.length === 0) {
      refs.resultsContainer.innerHTML = '';
      refs.emptyState.classList.remove('hidden');
      return;
    }

    refs.emptyState.classList.add('hidden');

    if (state.tab === 'tracks') {
      refs.resultsContainer.innerHTML = activeResults.map((track) => {
        const bookmarkKey = 'track:' + track.id;
        const isBookmarked = state.bookmarks.has(bookmarkKey);
        const languageBadge = track.language ? '<span class="badge badge-outline">' + escapeHTML(track.language) + '</span>' : '';
        const subtitleParts = [];
        if (track.artist) subtitleParts.push(track.artist);
        if (track.composer) subtitleParts.push(track.composer);
        const subtitle = subtitleParts.map(escapeHTML).join(' • ');
        const keyBadge = track.key ? '<span class="badge badge-outline">' + escapeHTML(track.key) + '</span>' : '<span class="badge badge-ghost">—</span>';
        const levelBadge = track.level ? '<span class="badge badge-outline">' + escapeHTML(track.level) + '</span>' : '<span class="badge badge-ghost">—</span>';
        return [
          '<article class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">',
          '  <div class="flex flex-wrap items-start justify-between gap-3">',
          '    <div class="space-y-1">',
          '      <h3 class="text-lg font-semibold">' + escapeHTML(track.title) + '</h3>',
          '      <p class="text-sm text-base-content/70">' + subtitle + '</p>',
          '    </div>',
          '    <div class="flex items-center gap-2">',
          '      ' + keyBadge,
          '      ' + levelBadge,
          '      <button type="button" class="btn btn-ghost btn-sm" data-bookmark="' + bookmarkKey + '" aria-pressed="' + String(isBookmarked) + '" title="' + (isBookmarked ? 'Remove bookmark' : 'Add bookmark') + '">' + (isBookmarked ? '★' : '☆') + '</button>',
          '    </div>',
          '  </div>',
          '  <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-base-content/70">',
          '    ' + languageBadge,
          '    <a class="link link-primary" href="/song/' + encodeURIComponent(track.id) + '">Open chart</a>',
          '  </div>',
          '</article>',
        ].join('');
      }).join('');
      return;
    }

    if (state.tab === 'albums') {
      refs.resultsContainer.innerHTML = activeResults.map((album) => {
        const bookmarkKey = 'album:' + album.id;
        const isBookmarked = state.bookmarks.has(bookmarkKey);
        return [
          '<article class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">',
          '  <div class="flex flex-wrap items-center justify-between gap-3">',
          '    <div>',
          '      <h3 class="text-lg font-semibold">' + escapeHTML(album.title) + '</h3>',
          '      <p class="text-sm text-base-content/70">' + escapeHTML(album.artist) + '</p>',
          '    </div>',
          '    <div class="flex items-center gap-2">',
          '      <span class="badge badge-outline">' + album.trackCount + ' tracks</span>',
          '      <button type="button" class="btn btn-ghost btn-sm" data-bookmark="' + bookmarkKey + '" aria-pressed="' + String(isBookmarked) + '" title="' + (isBookmarked ? 'Remove bookmark' : 'Add bookmark') + '">' + (isBookmarked ? '★' : '☆') + '</button>',
          '    </div>',
          '  </div>',
          '</article>',
        ].join('');
      }).join('');
      return;
    }

    refs.resultsContainer.innerHTML = activeResults.map((artist) => {
      const suffix = artist.songCount === 1 ? '' : 's';
      const url = '/search?tab=tracks&query=' + encodeURIComponent(artist.name);
      return [
        '<article class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">',
        '  <div class="flex flex-wrap items-center justify-between gap-3">',
        '    <div>',
        '      <h3 class="text-lg font-semibold">' + escapeHTML(artist.name) + '</h3>',
        '      <p class="text-sm text-base-content/70">' + artist.songCount + ' song' + suffix + '</p>',
        '    </div>',
        '    <a class="btn btn-sm btn-outline" href="' + url + '">View tracks</a>',
        '  </div>',
        '</article>',
      ].join('');
    }).join('');
  };

  refs.queryInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });

  refs.clearButton.addEventListener('click', () => {
    state.query = '';
    render();
    refs.queryInput.focus();
  });

  refs.languageButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.getAttribute('data-lang');
      if (state.languages.has(lang)) {
        state.languages.delete(lang);
      } else {
        state.languages.add(lang);
      }
      render();
    });
  });

  refs.tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.getAttribute('data-tab');
      if (tab && tab !== state.tab) {
        state.tab = tab;
        render();
      }
    });
  });

  refs.resultsContainer.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }
    const bookmark = target.closest('[data-bookmark]');
    if (!bookmark) {
      return;
    }
    const key = bookmark.getAttribute('data-bookmark');
    if (!key) {
      return;
    }
    if (state.bookmarks.has(key)) {
      state.bookmarks.delete(key);
    } else {
      state.bookmarks.add(key);
    }
    render();
  });

  render();
})();
`

func searchPayloadJSON() string {
	payload := struct {
		Tracks    []data.SearchTrack  `json:"tracks"`
		Albums    []data.SearchAlbum  `json:"albums"`
		Artists   []data.SearchArtist `json:"artists"`
		Languages []string            `json:"languages"`
	}{
		Tracks:    data.SearchTracks,
		Albums:    data.SearchAlbums,
		Artists:   data.SearchArtists,
		Languages: data.FilterLanguages,
	}

	bytes, err := json.Marshal(payload)
	if err != nil {
		log.Panicf("failed to marshal search payload: %v", err)
	}
	return string(bytes)
}

func searchClientScript() string {
	return searchClientJS
}

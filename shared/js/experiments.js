// Renders the Experiments grid from shared/data/experiments.json into a DOM
// node. Both the top-level index and experiments/index.html call this with
// their own paths and filter. Cards are emitted as `.card-div` panels — both
// pages already have CSS for that class, plus topic chips and the tag pill.
//
// Usage:
//   <div class="card-grid" id="experiments-grid"></div>
//   <script src="shared/js/experiments.js"></script>
//   <script>
//     renderExperiments({
//       jsonUrl: 'shared/data/experiments.json',
//       mountSelector: '#experiments-grid',
//       basePrefix: '',                          // 'shared/...' from this page
//       filter: c => c.showOnTopLevel === true,  // omit for "show all"
//     });
//   </script>
(function () {
  function escHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function renderCard(c, prefix) {
    var href = prefix + c.href;
    var topicsHtml = '';
    if (c.topics && c.topics.length) {
      var chips = c.topics.map(function (t) {
        return '<a class="card-topic" href="' + escHTML(prefix + t.href) + '">' +
                  escHTML(t.label) + '</a>';
      }).join('');
      topicsHtml = '<div class="card-topics">' + chips + '</div>';
    }
    return (
      '<div class="card-div" data-id="' + escHTML(c.id) + '">' +
        '<div class="card-icon">' + escHTML(c.icon) + '</div>' +
        '<h2><a href="' + escHTML(href) + '">' + escHTML(c.title) + '</a></h2>' +
        '<p>' + escHTML(c.description) + '</p>' +
        topicsHtml +
        '<span class="tag">' + escHTML(c.tag) + '</span>' +
      '</div>'
    );
  }

  // Mirrors the inline click handler on both pages: clicking the card body
  // (anywhere outside an explicit anchor) navigates to the title link.
  function attachCardClicks(root) {
    root.querySelectorAll('.card-div').forEach(function (card) {
      var titleLink = card.querySelector('h2 a');
      if (!titleLink) return;
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        location.href = titleLink.href;
      });
    });
  }

  window.renderExperiments = async function (opts) {
    var jsonUrl = opts.jsonUrl;
    var mountSelector = opts.mountSelector;
    var basePrefix = opts.basePrefix || '';
    var filter = opts.filter;
    var mount = document.querySelector(mountSelector);
    if (!mount) return;
    try {
      var data = await fetch(jsonUrl, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('fetch ' + r.status);
        return r.json();
      });
      var items = filter ? data.experiments.filter(filter) : data.experiments;
      mount.innerHTML = items.map(function (c) { return renderCard(c, basePrefix); }).join('');
      attachCardClicks(mount);
    } catch (err) {
      console.error('renderExperiments failed:', err);
      mount.innerHTML = '<p style="color:#888;font-size:13px">Failed to load experiments catalog.</p>';
    }
  };
})();

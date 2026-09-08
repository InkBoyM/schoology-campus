/* SchoologyCompass one-click import.
 *
 * Install: drag the "Import to SchoologyCompass" link on the /import page to
 * your bookmarks bar. Then, while logged into Schoology, open your grades
 * page (/grades/grades) and click the bookmark.
 *
 * What it does: reads the gradebook already rendered in YOUR browser tab
 * (same DOM that schoology-cli's grades.py parses), converts it to the
 * grades JSON shape, and opens SchoologyCompass with the data attached.
 * Nothing is sent anywhere else; no password involved.
 *
 * __SCHOOLOGY_COMPASS_ORIGIN__ is replaced with the app's origin by the
 * /import page when it builds the bookmark link.
 */
(function () {
  var APP_ORIGIN = '__SCHOOLOGY_COMPASS_ORIGIN__';

  function text(el) {
    if (!el) return '';
    var clone = el.cloneNode(true);
    var hidden = clone.querySelectorAll('.visually-hidden');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].remove();
    }
    return ((clone.textContent || '').replace(/\s+/g, ' ')).trim();
  }

  function cleanGrade(s) {
    if (!s || s === '—' || s === '-' || s.toLowerCase() === 'none') return null;
    return s;
  }

  // Like text(), but joins top-level child nodes with a space so adjacent
  // elements can't fuse ("1.78 / 2" + "89%" stays "1.78 / 2 89%").
  function cellText(td) {
    if (!td) return '';
    var clone = td.cloneNode(true);
    var hidden = clone.querySelectorAll('.visually-hidden');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].remove();
    }
    var parts = [];
    var nodes = clone.childNodes;
    for (var j = 0; j < nodes.length; j++) {
      var s = ((nodes[j].textContent || '').replace(/\s+/g, ' ')).trim();
      if (s) parts.push(s);
    }
    return parts.join(' ');
  }

  var courseItems = document.querySelectorAll('li.s-grades-course-item');
  if (!courseItems.length) {
    alert(
      'SchoologyCompass: no gradebook found on this page.\n\n' +
      'Open your Schoology grades page first (Grades in the top menu, ' +
      'URL ending in /grades/grades), then click the bookmark again.'
    );
    return;
  }

  var courses = [];
  for (var ci = 0; ci < courseItems.length; ci++) {
    var box = courseItems[ci].querySelector('div.gradebook-course');
    if (!box) continue;

    var courseId = (box.getAttribute('id') || '').replace('s-js-gradebook-course-', '');
    var titleEl = box.querySelector('.gradebook-course-title a');
    var courseTitle = text(titleEl) || 'Unknown Course';
    if (courseTitle.endsWith('Course')) courseTitle = courseTitle.slice(0, -6).trim();

    var courseGrade = null;
    var courseRow = box.querySelector('tr.course-row');
    if (courseRow) {
      var gCol = courseRow.querySelector('td.grade-column');
      courseGrade = cleanGrade(text(gCol));
    }

    var course = { id: courseId, title: courseTitle, grade: courseGrade, periods: [] };
    var table = box.querySelector('table');
    if (!table) {
      courses.push(course);
      continue;
    }

    var currentPeriod = null;
    var currentCategory = null;
    var rows = table.querySelectorAll('tr.report-row');
    for (var ri = 0; ri < rows.length; ri++) {
      var r = rows[ri];
      var classes = (r.getAttribute('class') || '').split(/\s+/);
      var dataId = r.getAttribute('data-id') || '';
      var titleTd = r.querySelector('th.title-column');
      var gradeTd = r.querySelector('td.grade-column');
      var commentTd = r.querySelector('td.comment-column');
      if (!titleTd) continue;

      var link = null;
      var linkEl = titleTd.querySelector('a');
      if (linkEl && linkEl.getAttribute('href')) link = linkEl.getAttribute('href');

      var dueDate = null;
      var dueEl = titleTd.querySelector('.due-date');
      if (dueEl) {
        dueDate = text(dueEl).replace('Due', '').trim() || null;
        dueEl.remove();
      }
      var contrib = null;
      var contribEl = titleTd.querySelector('.percentage-contrib');
      if (contribEl) {
        contrib = contribEl.textContent.replace(/[()]/g, '').replace(/\s+/g, ' ').trim() || null;
        contribEl.remove();
      }
      var rowTitle = cellText(titleTd);
      var gradeText = cleanGrade(cellText(gradeTd));
      var commentText = null;
      if (commentTd) {
        var c = cellText(commentTd);
        // Schoology pads empty comments with an invisible braille-blank.
        if (c && c !== 'No comment' && c.replace(/⠇/g, '').trim()) commentText = c;
      }

      if (classes.indexOf('period-row') !== -1) {
        currentPeriod = { id: dataId, title: rowTitle, weight: contrib, grade: gradeText, categories: [] };
        course.periods.push(currentPeriod);
        currentCategory = null;
      } else if (classes.indexOf('category-row') !== -1) {
        currentCategory = { id: dataId, title: rowTitle, weight: contrib, grade: gradeText, items: [] };
        if (!currentPeriod) {
          currentPeriod = { id: '0', title: 'General', weight: null, grade: null, categories: [] };
          course.periods.push(currentPeriod);
        }
        currentPeriod.categories.push(currentCategory);
      } else if (classes.indexOf('item-row') !== -1) {
        // Hidden "Add Assignment" action rows are not real assignments.
        if (/^add assignment$/i.test(rowTitle) && !dataId && !link) continue;
        var item = { id: dataId, title: rowTitle, grade: gradeText, due_date: dueDate, comment: commentText, url: link };
        if (!currentCategory) {
          if (!currentPeriod) {
            currentPeriod = { id: '0', title: 'General', weight: null, grade: null, categories: [] };
            course.periods.push(currentPeriod);
          }
          if (!currentPeriod.categories.length) {
            currentCategory = { id: '0', title: 'Uncategorized', weight: null, grade: null, items: [] };
            currentPeriod.categories.push(currentCategory);
          } else {
            currentCategory = currentPeriod.categories[currentPeriod.categories.length - 1];
          }
        }
        currentCategory.items.push(item);
      }
    }
    courses.push(course);
  }

  if (!courses.length) {
    alert('SchoologyCompass: found the gradebook but no courses in it.');
    return;
  }

  var payload = encodeURIComponent(JSON.stringify(courses));
  // Very large gradebooks can exceed URL limits; fall back to a file download.
  if (payload.length > 120000) {
    var blob = new Blob([JSON.stringify(courses, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grades.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    alert(
      'SchoologyCompass: your gradebook is large, so it was downloaded as grades.json.\n\n' +
      'Open ' + APP_ORIGIN + '/import and upload that file.'
    );
    return;
  }
  window.open(APP_ORIGIN + '/import#g=' + payload, '_blank');
})();

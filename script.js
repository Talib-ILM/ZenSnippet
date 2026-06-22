(function () {
    const STORAGE_KEY_SNIPPETS = 'code_manager_snippets';
    const STORAGE_KEY_HISTORY = 'code_manager_history';
    const MAX_HISTORY = 20;

    let snippets = [];
    let clipboardHistory = [];
    let editingSnippetId = null;

    const $ = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

    const snippetListEl = $('#snippet-list');
    const clipboardListEl = $('#clipboard-list');
    const snippetForm = $('#snippet-form');
    const snippetFormContainer = $('#snippet-form-container');
    const snippetIdInput = $('#snippet-id');
    const snippetTitleInput = $('#snippet-title');
    const snippetLanguageSelect = $('#snippet-language');
    const snippetContentTextarea = $('#snippet-content');
    const saveSnippetBtn = $('#save-snippet-btn');
    const cancelSnippetBtn = $('#cancel-snippet-btn');
    const addSnippetBtn = $('#add-snippet-btn');
    const snippetSearch = $('#snippet-search');
    const clipboardInput = $('#clipboard-input');
    const clearHistoryBtn = $('#clear-history-btn');

    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SNIPPETS);
            snippets = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(snippets)) snippets = [];
        } catch {
            snippets = [];
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
            clipboardHistory = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(clipboardHistory)) clipboardHistory = [];
        } catch {
            clipboardHistory = [];
        }
    }

    function saveSnippets() {
        try {
            localStorage.setItem(STORAGE_KEY_SNIPPETS, JSON.stringify(snippets));
        } catch (e) {
            showToast('Storage limit reached. Could not save snippets.');
        }
    }

    function saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(clipboardHistory));
        } catch (e) {
            showToast('Storage limit reached. Could not save clipboard history.');
        }
    }

    function showToast(message) {
        let toast = $('#toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function formatDate(ts) {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function truncate(str, len) {
        if (str.length <= len) return str;
        return str.slice(0, len) + '...';
    }

    function renderSnippets() {
        const query = snippetSearch.value.trim().toLowerCase();
        let filtered = snippets;
        if (query) {
            filtered = snippets.filter(s =>
                s.title.toLowerCase().includes(query) ||
                s.language.toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            snippetListEl.innerHTML = `<div class="empty-state">${query ? 'No snippets match your search.' : 'No snippets yet. Add your first code snippet!'}</div>`;
            return;
        }

        snippetListEl.innerHTML = filtered.map(s => `
            <div class="snippet-item" data-id="${s.id}">
                <div class="snippet-info">
                    <div class="snippet-title">${escapeHtml(s.title)}</div>
                    <div class="snippet-meta">
                        <span class="snippet-tag">${escapeHtml(s.language)}</span>
                        <span>${formatDate(s.updated)}</span>
                    </div>
                </div>
                <div class="snippet-actions">
                    <button class="btn-icon edit-snippet" title="View / Edit" data-id="${s.id}">&#9998;</button>
                    <button class="btn-icon copy-snippet" title="Copy Code" data-id="${s.id}">&#128203;</button>
                    <button class="btn-icon danger delete-snippet" title="Delete Snippet" data-id="${s.id}">&#128465;</button>
                </div>
            </div>
        `).join('');
    }

    function renderClipboard() {
        if (clipboardHistory.length === 0) {
            clipboardListEl.innerHTML = `<div class="empty-state">No clipboard history yet. Paste something above!</div>`;
            return;
        }

        clipboardListEl.innerHTML = clipboardHistory.map((item, index) => `
            <div class="clipboard-item" data-index="${index}">
                <div class="clipboard-preview">${escapeHtml(truncate(item, 100))}</div>
                <div class="clipboard-actions">
                    <button class="btn-icon copy-history" title="Copy Item" data-index="${index}">&#128203;</button>
                    <button class="btn-icon danger delete-history" title="Delete Item" data-index="${index}">&#128465;</button>
                </div>
            </div>
        `).join('');
    }

    function renderAll() {
        renderSnippets();
        renderClipboard();
    }

    function resetSnippetForm() {
        snippetForm.reset();
        snippetIdInput.value = '';
        editingSnippetId = null;
        saveSnippetBtn.textContent = 'Save Snippet';
        snippetFormContainer.classList.add('hidden');
    }

    function fillFormForEdit(snippet) {
        snippetIdInput.value = snippet.id;
        snippetTitleInput.value = snippet.title;
        snippetLanguageSelect.value = snippet.language;
        snippetContentTextarea.value = snippet.content;
        editingSnippetId = snippet.id;
        saveSnippetBtn.textContent = 'Update Snippet';
        snippetFormContainer.classList.remove('hidden');
        snippetTitleInput.focus();
    }

    snippetForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = snippetTitleInput.value.trim();
        const language = snippetLanguageSelect.value;
        const content = snippetContentTextarea.value;

        if (!title || !language || !content) return;

        const editId = snippetIdInput.value;

        if (editId) {
            const idx = snippets.findIndex(s => s.id === editId);
            if (idx !== -1) {
                snippets[idx].title = title;
                snippets[idx].language = language;
                snippets[idx].content = content;
                snippets[idx].updated = Date.now();
            }
            showToast('Snippet updated.');
        } else {
            snippets.push({
                id: generateId(),
                title,
                language,
                content,
                created: Date.now(),
                updated: Date.now(),
            });
            showToast('Snippet saved.');
        }

        saveSnippets();
        resetSnippetForm();
        renderSnippets();
    });

    cancelSnippetBtn.addEventListener('click', resetSnippetForm);

    addSnippetBtn.addEventListener('click', function () {
        resetSnippetForm();
        snippetFormContainer.classList.remove('hidden');
        snippetTitleInput.focus();
    });

    snippetListEl.addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        if (target.classList.contains('edit-snippet')) {
            const snippet = snippets.find(s => s.id === id);
            if (snippet) fillFormForEdit(snippet);
        }

        if (target.classList.contains('copy-snippet')) {
            const snippet = snippets.find(s => s.id === id);
            if (snippet) {
                navigator.clipboard.writeText(snippet.content).then(() => {
                    showToast('Code copied to clipboard.');
                }).catch(() => {
                    showToast('Failed to copy. Check clipboard permissions.');
                });
            }
        }

        if (target.classList.contains('delete-snippet')) {
            const snippet = snippets.find(s => s.id === id);
            if (snippet && confirm(`Delete "${snippet.title}"?`)) {
                snippets = snippets.filter(s => s.id !== id);
                saveSnippets();
                renderSnippets();
                if (editingSnippetId === id) resetSnippetForm();
                showToast('Snippet deleted.');
            }
        }
    });

    clipboardListEl.addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const index = parseInt(target.dataset.index, 10);

        if (target.classList.contains('copy-history')) {
            const text = clipboardHistory[index];
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Copied to clipboard.');
                }).catch(() => {
                    showToast('Failed to copy.');
                });
            }
        }

        if (target.classList.contains('delete-history')) {
            clipboardHistory.splice(index, 1);
            saveHistory();
            renderClipboard();
        }
    });

    clipboardInput.addEventListener('paste', function () {
        setTimeout(function () {
            const val = clipboardInput.value.trim();
            if (!val) return;

            clipboardHistory.unshift(val);
            if (clipboardHistory.length > MAX_HISTORY) {
                clipboardHistory = clipboardHistory.slice(0, MAX_HISTORY);
            }
            saveHistory();
            renderClipboard();
            clipboardInput.value = '';
            showToast('Added to clipboard history.');
        }, 50);
    });

    clearHistoryBtn.addEventListener('click', function () {
        if (clipboardHistory.length === 0) return;
        if (confirm('Clear all clipboard history?')) {
            clipboardHistory = [];
            saveHistory();
            renderClipboard();
            showToast('Clipboard history cleared.');
        }
    });

    snippetSearch.addEventListener('input', renderSnippets);

    $$('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            const panel = document.getElementById(tabId + '-tab');
            if (panel) panel.classList.add('active');
        });
    });

    loadData();
    renderAll();
})();

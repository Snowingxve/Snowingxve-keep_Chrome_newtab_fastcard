class CardManager {
    constructor() {
        this.STORAGE_KEY = 'userCards';
        this.container = document.getElementById('cardsContainer');
        this.init();
    }

    async init() {
        await this.loadCards();
        this.initSortable();
        this.addExternalEventListeners();
    }

    async loadCards() {
        const savedCards = await new Promise(resolve =>
            chrome.storage.local.get([this.STORAGE_KEY], result =>
                resolve(result[this.STORAGE_KEY] || [])
            )
        );

        const cards = savedCards.length > 0
            ? savedCards
            : await this.getTopSites();

        this.renderCards(cards);
    }

    async getTopSites() {
        const topSites = await chrome.topSites.get();
        return topSites.slice(0, 12).map(site => ({
            title: site.title || this.extractDomain(site.url),
            url: site.url,
            favicon: `https://www.google.com/s2/favicons?sz=64&domain=${new URL(site.url).hostname}`
        }));
    }

    renderCards(cards) {
        this.container.innerHTML = cards.map(card => `
      <a href="${card.url}" class="card" target="_blank">
        <img src="${card.favicon}" alt="${card.title}" 
             onerror="this.src='icons/fallback.svg'">
        <span>${card.title}</span>
      </a>
    `).join('');
    }

    initSortable() {
        new Sortable(this.container, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: async (evt) => {
                const cards = Array.from(this.container.children).map(item => ({
                    url: item.href,
                    title: item.querySelector('span').textContent,
                    favicon: item.querySelector('img').src
                }));
                await this.saveCards(cards);
            }
        });
    }

    async saveCards(cards) {
        await new Promise(resolve =>
            chrome.storage.local.set({ [this.STORAGE_KEY]: cards }, resolve)
        );
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname
                .replace('www.', '')
                .replace(/^(.{15}).+$/, '$1…');
        } catch {
            return url.slice(0, 15) + '…';
        }
    }

    addExternalEventListeners() {

        if (new Date().getDay() === 1) {
            chrome.storage.local.remove(this.STORAGE_KEY);
        }

        chrome.storage.onChanged.addListener(changes => {
            if (changes[this.STORAGE_KEY]) {
                this.renderCards(changes[this.STORAGE_KEY].newValue);
            }
        });
    }
}

new CardManager();
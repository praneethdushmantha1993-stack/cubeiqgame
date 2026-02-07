/**
 * Game Storage - ලකුණු සහ levels save කිරීම
 * localStorage හෝ Facebook Instant Games player data
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'cubeiq_data';
    let fbCache = null;

    function parseData(raw) {
        if (!raw) return { bestScore: 0, maxLevel: 1, totalScore: 0, lastGameScore: null, coins: 0, purchasedSkins: [], selectedSkinId: null, giftSlots: [] };
        try {
            const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
            var best = parseInt(d.bestScore, 10) || 0;
            var total = parseInt(d.totalScore, 10);
            if (isNaN(total) && best > 0) total = best;
            var lastGame = parseInt(d.lastGameScore, 10);
            var coins = parseInt(d.coins, 10);
            var purchased = d.purchasedSkins;
            var selected = d.selectedSkinId;
            var gifts = d.giftSlots;
            return {
                bestScore: best,
                maxLevel: parseInt(d.maxLevel, 10) || 1,
                totalScore: total >= 0 ? total : 0,
                lastGameScore: isNaN(lastGame) ? null : lastGame,
                coins: isNaN(coins) ? 0 : coins,
                purchasedSkins: Array.isArray(purchased) ? purchased : [],
                selectedSkinId: selected || null,
                giftSlots: Array.isArray(gifts) ? gifts.slice(0, 3) : []
            };
        } catch (e) {
            return { bestScore: 0, maxLevel: 1, totalScore: 0, lastGameScore: null, coins: 0, purchasedSkins: [], selectedSkinId: null, giftSlots: [] };
        }
    }

    window.GameStorage = {
        read: function() {
            if (typeof FBInstantBridge !== 'undefined' && FBInstantBridge.isFBInstant() && fbCache) {
                return fbCache;
            }
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return parseData(raw);
            } catch (e) {
                return { bestScore: 0, maxLevel: 1 };
            }
        },

        write: function(data) {
            try {
                const current = this.read();
                const next = {
                    bestScore: data.bestScore !== undefined ? data.bestScore : current.bestScore,
                    maxLevel: data.maxLevel !== undefined ? data.maxLevel : current.maxLevel,
                    totalScore: data.totalScore !== undefined ? data.totalScore : (current.totalScore || 0),
                    lastGameScore: data.lastGameScore !== undefined ? data.lastGameScore : current.lastGameScore,
                    coins: data.coins !== undefined ? data.coins : (current.coins || 0),
                    purchasedSkins: data.purchasedSkins !== undefined ? data.purchasedSkins : (current.purchasedSkins || []),
                    selectedSkinId: data.selectedSkinId !== undefined ? data.selectedSkinId : current.selectedSkinId,
                    giftSlots: data.giftSlots !== undefined ? data.giftSlots : (current.giftSlots || [])
                };
                if (typeof FBInstantBridge !== 'undefined' && FBInstantBridge.isFBInstant()) {
                    fbCache = next;
                    FBInstantBridge.setPlayerData(next);
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e) {}
        },

        loadSavedProgress: function() {
            const d = this.read();
            const bestEl = document.getElementById('best-score-val');
            if (bestEl && d.bestScore > 0) bestEl.innerText = d.bestScore;
            return d;
        },

        loadFromFB: function() {
            if (typeof FBInstantBridge === 'undefined' || !FBInstantBridge.isFBInstant()) {
                return Promise.resolve(this.loadSavedProgress());
            }
            return FBInstantBridge.getPlayerData()
                .then(raw => {
                    if (raw) {
                        const parsed = parseData(raw);
                        fbCache = parsed;
                        const bestEl = document.getElementById('best-score-val');
                        if (bestEl && parsed.bestScore > 0) bestEl.innerText = parsed.bestScore;
                        try { localStorage.setItem(STORAGE_KEY, typeof raw === 'string' ? raw : JSON.stringify(parsed)); } catch (e) {}
                        return parsed;
                    }
                    return this.loadSavedProgress();
                })
                .catch(() => this.loadSavedProgress());
        }
    };
})();

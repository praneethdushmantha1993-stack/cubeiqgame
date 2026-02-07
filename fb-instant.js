/**
 * Facebook Instant Games Integration
 * Game එක FB Instant Games ප්ලැට්ෆෝමයට ගැලපෙන විදියට
 */
(function() {
    'use strict';

    window.FBInstantBridge = {
        isReady: false,
        isFBInstant: function() {
            return typeof FBInstant !== 'undefined';
        },

        init: function() {
            if (!this.isFBInstant()) {
                this.isReady = true;
                return Promise.resolve();
            }
            return FBInstant.initializeAsync()
                .then(() => {
                    this.isReady = true;
                    return this;
                })
                .catch(err => {
                    console.warn('FBInstant init failed:', err);
                    this.isReady = true;
                    return this;
                });
        },

        setLoadingProgress: function(progress) {
            if (this.isFBInstant() && FBInstant.setLoadingProgress) {
                FBInstant.setLoadingProgress(Math.min(100, progress));
            }
        },

        startGame: function() {
            if (!this.isFBInstant()) return Promise.resolve();
            return FBInstant.startGameAsync().catch(err => {
                console.warn('FBInstant startGame failed:', err);
            });
        },

        getRewardedVideo: function(placementId) {
            if (!this.isFBInstant() || !FBInstant.getRewardedVideoAsync) return null;
            return FBInstant.getRewardedVideoAsync(placementId || 'rewarded_video');
        },

        showRewardedAd: function(placementId, onReward, onError) {
            if (!this.isFBInstant()) {
                if (onReward) setTimeout(onReward, 500);
                return Promise.resolve();
            }
            var videoPromise = this.getRewardedVideo(placementId);
            if (!videoPromise) {
                if (onReward) setTimeout(onReward, 300);
                return Promise.resolve();
            }
            return videoPromise
                .then(ad => ad ? ad.loadAsync() : Promise.reject(new Error('No ad')))
                .then(ad => ad ? ad.showAsync() : Promise.reject(new Error('No ad')))
                .then(() => {
                    if (onReward) onReward();
                    return true;
                })
                .catch(err => {
                    var unsupported = err && (err.code === 'CLIENT_UNSUPPORTED_OPERATION' || 
                        (err.message && err.message.indexOf('getrewardedvideoasync') !== -1));
                    if (!unsupported) console.warn('Rewarded ad error:', err);
                    if (onError) onError(err);
                    else if (onReward) onReward();
                    return false;
                });
        },

        setPlayerData: function(data) {
            if (!this.isFBInstant() || !FBInstant.player || !FBInstant.player.setDataAsync) return Promise.resolve();
            const str = typeof data === 'string' ? data : JSON.stringify(data);
            return FBInstant.player.setDataAsync({ cubeiq_data: str }).catch(function() {});
        },

        getPlayerData: function() {
            if (!this.isFBInstant() || !FBInstant.player || !FBInstant.player.getDataAsync) return Promise.resolve(null);
            return FBInstant.player.getDataAsync(['cubeiq_data'])
                .then(function(data) { return (data && data.cubeiq_data) ? data.cubeiq_data : null; })
                .catch(function() { return null; });
        },

        setLeaderboardScore: function(score) {
            if (!this.isFBInstant() || !FBInstant.getLeaderboardAsync) return Promise.resolve();
            return FBInstant.getLeaderboardAsync('cubeiq_leaderboard')
                .then(leaderboard => leaderboard.setScoreAsync(score))
                .catch(() => {});
        },

        quit: function() {
            if (this.isFBInstant() && FBInstant.quit) FBInstant.quit();
        }
    };
})();

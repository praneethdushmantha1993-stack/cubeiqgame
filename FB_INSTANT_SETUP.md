# Facebook Instant Games - Setup

## 1. App එක හදන්න
- [developers.facebook.com](https://developers.facebook.com) → Create App → Gaming
- App Dashboard → Add Product → Instant Games

## 2. ගෙනයන්න
- Game files ZIP කරන්න (index.html root එකේ)
- Web Hosting tab → Instant Game → Upload Version → ZIP select කරන්න

## 3. Leaderboard
- Gaming Services → Leaderboards → Create
- Name: `cubeiq_leaderboard`
- Order: Higher is better

## 4. Rewarded Ads (Optional)
- Monetization Manager → Ad Placements → Rewarded Video
- Placement ID එක fb-instant.js එකේ `getRewardedVideo` එකට දාන්න

## 5. fbapp-config.json
- Already included - orientation: PORTRAIT

## 6. Test
- Upload කරලා Build එක ★ (star) කරන්න
- Messenger හෝ Facebook හි In Development එකේ test කරන්න

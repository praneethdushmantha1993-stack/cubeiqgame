/**
 * Cube Skin Marketplace
 * Skins මිලදී ගැනීම සහ තෝරා ගැනීම
 */
const SKIN_CATALOG = [
    { id: 'orange', name: 'Orange', nameSi: 'දෙහි', border: '#e65100', line: '#ffcc80', accent: '#ff6d00', bg: '#fff3e0', price: 0, levelUnlock: 1 },
    { id: 'blue', name: 'Blue', nameSi: 'නිල්', border: '#0277bd', line: '#81d4fa', accent: '#0288d1', bg: '#e1f5fe', price: 0, levelUnlock: 1 },
    { id: 'purple', name: 'Purple', nameSi: 'දම්', border: '#7b1fa2', line: '#ce93d8', accent: '#9c27b0', bg: '#f3e5f5', price: 0, levelUnlock: 1 },
    { id: 'green', name: 'Green', nameSi: 'කොළ', border: '#2e7d32', line: '#a5d6a7', accent: '#43a047', bg: '#e8f5e9', price: 0, levelUnlock: 1 },
    { id: 'red', name: 'Red', nameSi: 'ලාල්', border: '#c62828', line: '#ef9a9a', accent: '#d32f2f', bg: '#ffebee', price: 0, levelUnlock: 1 },
    { id: 'navy', name: 'Navy Blue', nameSi: 'ගැඹුරු නිල්', border: '#1565c0', line: '#90caf9', accent: '#1976d2', bg: '#e3f2fd', price: 0, levelUnlock: 1 },
    { id: 'mandala', name: 'Mandala', nameSi: 'ලියවැල', border: '#d4af37', line: '#f4e4a6', accent: '#b8860b', bg: '#0d0d0d', style: 'mandala', price: 0, levelUnlock: 1 },
    { id: 'cyan', name: 'Cyan', nameSi: 'අහ්නිල්', border: '#00838f', line: '#80deea', accent: '#00acc1', bg: '#e0f7fa', price: 0, levelUnlock: 1 },
    { id: 'coral', name: 'Coral', nameSi: 'කොරල්', border: '#d84315', line: '#ffab91', accent: '#ff5722', bg: '#fbe9e7', price: 0, levelUnlock: 1 },
    { id: 'amber', name: 'Amber', nameSi: 'රන්', border: '#ff8f00', line: '#ffe082', accent: '#ffa000', bg: '#fff8e1', price: 0, levelUnlock: 1 },
    { id: 'indigo', name: 'Indigo', nameSi: 'ඉන්ඩිගෝ', border: '#3949ab', line: '#9fa8da', accent: '#5c6bc0', bg: '#e8eaf6', price: 0, levelUnlock: 1 },
    { id: 'emerald', name: 'Emerald', nameSi: 'මැණික් කොළ', border: '#00695c', line: '#80cbc4', accent: '#00897b', bg: '#e0f2f1', price: 0, levelUnlock: 1 },
];

function getSkinById(id) {
    return SKIN_CATALOG.find(s => s.id === id) || SKIN_CATALOG[0];
}

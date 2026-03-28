import fs from 'fs';

const filePath = 'app/recipe/[id].tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace standard dark theme colors with COLORS equivalents
content = content.replace(/backgroundColor: '#0a0a0f'/g, "backgroundColor: COLORS.bg");
content = content.replace(/backgroundColor: '#111827'/g, "backgroundColor: COLORS.surfaceDeep");
content = content.replace(/backgroundColor: '#16213e'/g, "backgroundColor: COLORS.surface");
content = content.replace(/color: '#fff'/g, "color: COLORS.textPrimary");
content = content.replace(/color: '#cbd5e1'/g, "color: COLORS.textPrimary");
content = content.replace(/color: '#94a3b8'/g, "color: COLORS.textSecondary");
content = content.replace(/color: '#64748b'/g, "color: COLORS.textMuted");
content = content.replace(/color: '#475569'/g, "color: COLORS.textFaint");
content = content.replace(/borderColor: 'rgba\(255,255,255,0.05\)'/g, "borderColor: COLORS.border");
content = content.replace(/backgroundColor: '#1e293b'/g, "backgroundColor: COLORS.surfaceDeep");
content = content.replace(/color="#fff"/g, 'color={COLORS.textPrimary}');
content = content.replace(/backgroundColor: 'rgba\(245, 166, 35, 0.1\)'/g, "backgroundColor: COLORS.primaryTint");
content = content.replace(/backgroundColor: 'rgba\(245, 166, 35, 0.15\)'/g, "backgroundColor: COLORS.primaryTint");
content = content.replace(/backgroundColor: 'rgba\(245, 166, 35, 0.2\)'/g, "backgroundColor: COLORS.primaryTint");
content = content.replace(/borderColor: 'rgba\(245, 166, 35, 0.3\)'/g, "borderColor: COLORS.border");
content = content.replace(/color: '#f5a623'/g, "color: COLORS.primary");
content = content.replace(/color="#f5a623"/g, 'color={COLORS.primary}');
content = content.replace(/backgroundColor: '#f5a623'/g, "backgroundColor: COLORS.primary");
content = content.replace(/borderColor: '#f5a623'/g, "borderColor: COLORS.primary");
content = content.replace(/\['#f5a623', '#d97706'\]/g, "[COLORS.primary, COLORS.primaryLight]");

fs.writeFileSync(filePath, content);
console.log("Colors replaced");

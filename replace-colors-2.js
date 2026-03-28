import fs from 'fs';

const filePath = 'app/recipe/[id].tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(/color="#ef4444"/g, 'color={COLORS.error}');
content = content.replace(/color: '#ef4444'/g, 'color: COLORS.error');
content = content.replace(/color="#64748b"/g, 'color={COLORS.textMuted}');
content = content.replace(/color="#94a3b8"/g, 'color={COLORS.textSecondary}');
content = content.replace(/color="#38bdf8"/g, 'color={COLORS.primary}');
content = content.replace(/color="#a78bfa"/g, 'color={COLORS.purple}');
content = content.replace(/color="#60a5fa"/g, 'color={COLORS.primary}');
content = content.replace(/color: '#60a5fa'/g, 'color: COLORS.primary');
content = content.replace(/\['#1e293b', '#0a0a0f'\]/g, "['transparent', COLORS.bg]");
content = content.replace(/\['#f5a623', '#ea580c'\]/g, "[COLORS.primary, COLORS.primaryLight]");
content = content.replace(/shadowColor: '#f5a623'/g, 'shadowColor: COLORS.primary');

fs.writeFileSync(filePath, content);
console.log("Colors replaced phase 2");

import { CardGenerator } from './cardGenerator.js';

class Workstation {
    constructor() {
        this.generator = new CardGenerator();
        this.previewContainer = document.getElementById('card-preview');
        this.state = {
            faction: '魏',
            title: '湖上冰精',
            name: '琪露诺',
            hp: 3,
            maxHp: 3,
            armor: 0,
            artImage: './assets/example/example.jpg',
            skills: [
                { name: '冻结', type: '锁定技', desc: '攻击范围内角色的【杀】对你无效。' },
                { name: '天才', type: '锁定技', desc: '你的手牌上限始终为 9。' }
            ],
            flavor: '“我才是最强的！”',
            titleFont: 'XiaoZhuan',
            nameFont: 'XingKai',
            titleColor: '#fff100',
            nameColor: '#ffffff',
            hideFaction: false,
            enableCustomBorder: false,
            borderColor: '#81b2d1',
            customFaction: '',
            layouts: {},
            highlight: null,
            selected: null,
            zoom: 1,
            panX: 0,
            panY: 0
        };

        this.defaults = JSON.parse(JSON.stringify(this.generator.LAYOUT_DEFAULTS));
        this.state.layouts = JSON.parse(JSON.stringify(this.defaults));
        this.state.zoom = 1;

        this.init();
    }

    async init() {
        try {
            await this.generator.loadResources();
            this.bindEvents();
            this.initInteractivity();
            this.render();
            // Apply initial zoom
            const container = document.querySelector('.interactive-canvas');
            if (container) container.style.transform = `scale(${this.state.zoom})`;
        } catch (error) {
            console.error('Initialization failed', error);
        }
    }

    bindEvents() {
        const factionSelect = document.getElementById('hero-faction');
        factionSelect.addEventListener('change', (e) => {
            this.state.faction = e.target.value;
            const customGroup = document.getElementById('custom-faction-group');
            if (customGroup) customGroup.style.display = (this.state.faction === '自定义') ? 'block' : 'none';
            this.render();
        });

        const customFactionInput = document.getElementById('custom-faction');
        if (customFactionInput) {
            customFactionInput.addEventListener('input', (e) => {
                this.state.customFaction = e.target.value;
                this.render();
            });
        }

        document.getElementById('hero-title').addEventListener('input', (e) => {
            this.state.title = e.target.value;
            this.render();
        });

        document.getElementById('hero-name').addEventListener('input', (e) => {
            this.state.name = e.target.value;
            this.render();
        });

        document.getElementById('hero-hp').addEventListener('input', (e) => {
            this.state.hp = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('hero-max-hp').addEventListener('input', (e) => {
            this.state.maxHp = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('hero-armor').addEventListener('input', (e) => {
            this.state.armor = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('hero-art-url').addEventListener('change', (e) => {
            this.state.artImage = e.target.value;
            this.render();
        });

        const fileInput = document.getElementById('hero-art-file');
        document.getElementById('drop-zone').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.state.artImage = event.target.result;
                    this.render();
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('btn-add-skill').addEventListener('click', () => {
            this.state.skills.push({ name: '新技能', type: '普通技', desc: '描述文字' });
            this.updateSkillsUI();
            this.render();
        });

        document.getElementById('hero-flavor').addEventListener('input', (e) => {
            this.state.flavor = e.target.value;
            this.render();
        });

        document.getElementById('hide-faction').addEventListener('change', (e) => {
            this.state.hideFaction = e.target.checked;
            this.render();
        });

        document.getElementById('title-font').addEventListener('change', (e) => {
            this.state.titleFont = e.target.value;
            this.render();
        });

        document.getElementById('title-color').addEventListener('input', (e) => {
            this.state.titleColor = e.target.value;
            this.render();
        });

        document.getElementById('name-font').addEventListener('change', (e) => {
            this.state.nameFont = e.target.value;
            this.render();
        });

        document.getElementById('name-color').addEventListener('input', (e) => {
            this.state.nameColor = e.target.value;
            this.render();
        });

        document.getElementById('custom-border-toggle').addEventListener('change', (e) => {
            this.state.enableCustomBorder = e.target.checked;
            this.render();
        });

        document.getElementById('hero-border-color').addEventListener('input', (e) => {
            this.state.borderColor = e.target.value;
            this.render();
        });

        document.querySelectorAll('.layout-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const path = e.target.dataset.path.split('.');
                const value = parseFloat(e.target.value);
                let current = this.state.layouts;
                for (let i = 0; i < path.length - 1; i++) {
                    if (!current[path[i]]) current[path[i]] = {};
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = value;
                this.render();
            });
        });

        document.querySelectorAll('.btn-reset-layout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                this.state.layouts[target] = JSON.parse(JSON.stringify(this.defaults[target]));
                this.syncLayoutInputs();
                this.render();
            });
        });

        document.getElementById('btn-export').addEventListener('click', () => this.exportImage());
        document.getElementById('btn-export-json').addEventListener('click', () => {
            const data = JSON.stringify(this.state, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `SGS-Project-${this.state.name || 'Hero'}.json`;
            link.click();
        });

        const jsonInput = document.getElementById('json-input');
        document.getElementById('btn-import-json').addEventListener('click', () => jsonInput.click());
        jsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedState = JSON.parse(event.target.result);
                        this.state = { ...this.state, ...importedState };
                        this.syncInputs();
                        this.updateSkillsUI();
                        this.render();
                    } catch (err) { alert('项目文件无效'); }
                };
                reader.readAsText(file);
            }
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            if (confirm('确定要重置所有修改（包括布局）吗？')) {
                this.state.layouts = JSON.parse(JSON.stringify(this.generator.LAYOUT_DEFAULTS));
                this.syncInputs();
                this.render();
            }
        });

        this.updateSkillsUI();
        this.syncInputs();
    }

    syncInputs() {
        document.getElementById('hero-faction').value = this.state.faction;
        const customGroup = document.getElementById('custom-faction-group');
        if (customGroup) {
            customGroup.style.display = (this.state.faction === '自定义') ? 'block' : 'none';
            document.getElementById('custom-faction').value = this.state.customFaction || '';
        }
        document.getElementById('hero-title').value = this.state.title;
        document.getElementById('hero-name').value = this.state.name;
        document.getElementById('hero-hp').value = this.state.hp;
        document.getElementById('hero-max-hp').value = this.state.maxHp;
        document.getElementById('hero-armor').value = this.state.armor;
        document.getElementById('hero-flavor').value = this.state.flavor;
        document.getElementById('hide-faction').checked = this.state.hideFaction;
        document.getElementById('title-font').value = this.state.titleFont;
        document.getElementById('title-color').value = this.state.titleColor;
        document.getElementById('name-font').value = this.state.nameFont;
        document.getElementById('name-color').value = this.state.nameColor;
        document.getElementById('custom-border-toggle').checked = this.state.enableCustomBorder;
        document.getElementById('hero-border-color').value = this.state.borderColor;
        this.syncLayoutInputs();
    }

    syncLayoutInputs() {
        document.querySelectorAll('.layout-input').forEach(input => {
            const path = input.dataset.path.split('.');
            let value = this.state.layouts;
            for (const key of path) {
                if (value) value = value[key];
            }
            if (value !== undefined) input.value = typeof value === 'number' ? Math.round(value * 100) / 100 : value;
        });
    }

    initInteractivity() {
        const canvas = this.generator.canvas;
        const container = document.querySelector('.interactive-canvas');
        const workspace = document.querySelector('.preview-section');
        let isDragging = false;
        let isPanning = false;
        let activeComponent = null;
        let startX, startY;
        let pstartX, pstartY;
        let dragMode = 'move';

        const updateTransform = () => {
            container.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom})`;
        };

        workspace.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.state.zoom = Math.min(Math.max(0.1, this.state.zoom + delta), 4);
            updateTransform();
        }, { passive: false });

        const getMousePos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.width / rect.width;
            return {
                x: (e.clientX - rect.left) * scale / 3,
                y: (e.clientY - rect.top) * scale / 3
            };
        };

        const detectComponent = (pos) => {
            const config = { ...this.state };
            if (config.faction === '自定义') config.faction = config.customFaction || '神';
            const order = ['title', 'heroName', 'faction', 'hp', 'skillBox', 'skillTags', 'skillText'];
            for (const comp of order.reverse()) {
                const rect = this.generator.getComponentRect(comp, config);
                if (!rect) continue;
                const dx = pos.x - rect.cx;
                const dy = pos.y - rect.cy;
                const rad = (-rect.rotation * Math.PI) / 180;
                const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
                const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

                if (this.state.selected === comp) {
                    if (Math.sqrt(rx ** 2 + (ry - (-rect.h / 2 - 20)) ** 2) < 15) return { comp, handle: 'rotate' };
                    if (Math.abs(rx - rect.w / 2) < 15 && Math.abs(ry - rect.h / 2) < 15) return { comp, handle: 'resize' };
                }
                if (rx > -rect.w / 2 - 10 && rx < rect.w / 2 + 10 && ry > -rect.h / 2 - 10 && ry < rect.h / 2 + 10) {
                    return { comp, handle: 'move' };
                }
            }
            return null;
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getMousePos(e);
            const target = detectComponent(pos);

            if (target) {
                this.state.selected = target.comp;
                isDragging = true;
                activeComponent = target.comp;
                dragMode = target.handle;
                startX = pos.x;
                startY = pos.y;
                container.style.transition = 'none';
                this.fastRender();
            } else {
                this.state.selected = null;
                isPanning = true;
                pstartX = e.clientX - this.state.panX;
                pstartY = e.clientY - this.state.panY;
                container.style.transition = 'none';
                this.fastRender();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isPanning) {
                this.state.panX = e.clientX - pstartX;
                this.state.panY = e.clientY - pstartY;
                updateTransform();
                return;
            }

            const pos = getMousePos(e);
            if (!isDragging) {
                const target = detectComponent(pos);
                canvas.style.cursor = target ? (target.handle === 'move' ? 'grab' : 'crosshair') : 'default';
                const hoverComp = target ? target.comp : null;
                if (this.state.highlight !== hoverComp) {
                    this.state.highlight = hoverComp;
                    this.fastRender();
                }
                return;
            }

            const layout = this.state.layouts[activeComponent];
            const dx = pos.x - startX;
            const dy = pos.y - startY;

            if (dragMode === 'move') {
                layout.x += dx;
                if (layout.y !== undefined) layout.y += dy;
            } else if (dragMode === 'rotate') {
                const rect = this.generator.getComponentRect(activeComponent, this.state);
                const angle = Math.atan2(pos.y - rect.cy, pos.x - rect.cx) * 180 / Math.PI;
                layout.rotation = Math.round(angle + 90);
            } else if (dragMode === 'resize') {
                if (activeComponent === 'faction' || activeComponent === 'hp') {
                    layout.size = Math.max(10, layout.size + dx);
                }
            }

            startX = pos.x;
            startY = pos.y;
            this.syncLayoutInputs();
            this.fastRender();
        });

        window.addEventListener('mouseup', () => {
            container.style.transition = 'transform 0.1s ease-out';
            if (isDragging || isPanning) {
                isDragging = false;
                isPanning = false;
                this.render();
            }
        });

        // Double click background to reset view
        workspace.addEventListener('dblclick', (e) => {
            if (e.target === workspace || e.target === this.previewContainer) {
                this.state.zoom = 1;
                this.state.panX = 0;
                this.state.panY = 0;
                updateTransform();
            }
        });
    }

    updateSkillsUI() {
        const container = document.getElementById('skills-list');
        const addBtn = document.getElementById('btn-add-skill');
        container.innerHTML = '';
        this.state.skills.forEach((skill, index) => {
            const div = document.createElement('div');
            div.className = 'skill-editor-item box-glass';
            div.innerHTML = `
                <input type="text" class="skill-name form-control" value="${skill.name}" placeholder="技能名">
                <select class="skill-type form-control">
                    <option value="普通技" ${skill.type === '普通技' ? 'selected' : ''}>普通技</option>
                    <option value="锁定技" ${skill.type === '锁定技' ? 'selected' : ''}>锁定技</option>
                    <option value="觉醒技" ${skill.type === '觉醒技' ? 'selected' : ''}>觉醒技</option>
                    <option value="限定技" ${skill.type === '限定技' ? 'selected' : ''}>限定技</option>
                    <option value="主公技" ${skill.type === '主公技' ? 'selected' : ''}>主公技</option>
                </select>
                <textarea class="skill-desc form-control" placeholder="技能描述">${skill.desc}</textarea>
                <button class="btn-remove-skill">&times;</button>
            `;
            div.querySelector('.skill-name').addEventListener('input', (e) => { this.state.skills[index].name = e.target.value; this.render(); });
            div.querySelector('.skill-type').addEventListener('change', (e) => { this.state.skills[index].type = e.target.value; this.render(); });
            div.querySelector('.skill-desc').addEventListener('input', (e) => { this.state.skills[index].desc = e.target.value; this.render(); });
            div.querySelector('.btn-remove-skill').addEventListener('click', () => {
                this.state.skills.splice(index, 1);
                this.updateSkillsUI();
                this.render();
            });
            container.appendChild(div);
        });
        container.appendChild(addBtn);
    }

    async render() {
        if (this.renderTimeout) clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(async () => {
            const config = { ...this.state };
            if (config.faction === '自定义') config.faction = config.customFaction || '神';
            await this.generator.generateCard(config);
            if (!this.previewContainer.contains(this.generator.canvas)) {
                this.previewContainer.innerHTML = '';
                this.previewContainer.appendChild(this.generator.canvas);
            }
        }, 50);
    }

    fastRender() {
        const config = { ...this.state };
        if (config.faction === '自定义') config.faction = config.customFaction || '神';
        const normalizedFaction = this.generator.FACTION_NORMALIZE[config.faction] || config.faction || '神';
        const data = {
            faction: normalizedFaction,
            hp: config.hp, maxHp: config.maxHp, armor: config.armor,
            title: config.title, name: config.name, skills: config.skills, flavor: config.flavor,
            titleFont: config.titleFont, nameFont: config.nameFont,
            titleColor: config.titleColor, nameColor: config.nameColor,
            enableCustomBorder: config.enableCustomBorder, borderColor: config.borderColor,
            hideFaction: config.hideFaction,
            layouts: this.generator.deepMerge(this.generator.LAYOUT_DEFAULTS, config.layouts || {}),
            highlight: config.highlight, selected: config.selected
        };
        this.generator.drawCard(data);
    }

    async exportImage() {
        const config = { ...this.state, highlight: null, selected: null };
        const blobUrl = await this.generator.generateCard(config);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `SGS-Card-${this.state.name || 'Hero'}.png`;
        link.click();
    }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new Workstation(); });

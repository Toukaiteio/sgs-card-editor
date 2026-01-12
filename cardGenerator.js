/**
 * SGS Card Generator Module
 * Generates card images based on provided configuration
 */

export class CardGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scratchCanvas = document.createElement('canvas');
        this.scratchCtx = this.scratchCanvas.getContext('2d');
        this.CONFIG = {
            width: 400,
            height: 570,
            theme: {
                primary: '#dcb35c',
                border: '#dcb35c',
                skillBoxBg: 'rgba(235, 235, 235, 0.75)',
                skillBoxBorder: 'rgba(0, 0, 0, 0.15)',
                skillText: '#1a1a1a',
                tagBg: '#111',
                tagBorder: '#ccc',
                tagText: '#ffd700',
            },
            assets: {
                border: { '神': 'shen', '魏': 'wei', '蜀': 'shu', '吴': 'wu', '群': 'qun', '晋': 'jin' },
                skill: { '神': 'shen', '魏': 'wei', '蜀': 'shu', '吴': 'wu', '群': 'qun', '晋': 'jin' }
            }
        };

        this.LAYOUT_DEFAULTS = {
            heroInfo: { x: 45, y: 120, titleSize: 24, nameSize: 42, titleSpacing: 26, nameSpacing: 46, rotation: 0 },
            faction: { x: 45, y: 60, size: 80, rotation: 0 },
            hp: { x: 80, y: 25, size: 38, spacing: 0.65, rotation: 0 },
            skillBox: { x: 62, y: 490, w: 340, h: 80, rotation: 0 },
            skillTags: { x: 15, y: 495, w: 70, h: 30, rotation: 0 },
            skillText: { x: 90, y: 495, rotation: 0 },
            bottom: { height: 30, yOffset: 5 }
        };
        // Backup for reset logic
        this.SAVED_DEFAULTS = JSON.parse(JSON.stringify(this.LAYOUT_DEFAULTS));

        this.loadedImages = {
            border: {},
            heart: {},
            skill: {},
            bottom: null,
            art: null
        };

        this.FACTION_THEMES = {
            '神': { primary: '#dcb35c', border: '#dcb35c', tagText: '#ffd700', skillBoxBorder: '#4a3b2a' },
            '魏': { primary: '#2b4c85', border: '#2b4c85', tagText: '#a4c2f4', skillBoxBorder: '#1f3a60' },
            '蜀': { primary: '#a82e2e', border: '#a82e2e', tagText: '#f4a4f4', skillBoxBorder: '#5e1b1b' },
            '吴': { primary: '#2ea84e', border: '#2ea84e', tagText: '#a4f4bd', skillBoxBorder: '#1e5e30' },
            '群': { primary: '#8c8c8c', border: '#8c8c8c', tagText: '#eeeeee', skillBoxBorder: '#555555' },
            '晋': { primary: '#9d4dbb', border: '#9d4dbb', tagText: '#d8b4e8', skillBoxBorder: '#4a2558' }
        };

        this.FACTION_NORMALIZE = {
            '吳': '吴', '蜀': '蜀', '魏': '魏', '群': '群', '晉': '晋', '神': '神'
        };

        this.resourcesLoaded = false;
        this.basePath = './';
    }

    setBasePath(path) { this.basePath = path; }

    async loadResources() {
        if (this.resourcesLoaded) return;
        console.log("Loading resources...");
        const fontList = [
            { name: 'HuangCao', url: `${this.basePath}font/huangcao.woff2` },
            { name: 'XingKai', url: `${this.basePath}font/xingkai.woff2` },
            { name: 'XiaoZhuan', url: `${this.basePath}font/xiaozhuan.woff2` },
            { name: 'XinWei', url: `${this.basePath}font/xinwei.woff2` },
            { name: 'Suits', url: `${this.basePath}font/suits.woff2` },
            { name: 'ShouSha', url: `${this.basePath}font/shousha.woff2` },
            { name: 'YuanLi', url: `${this.basePath}font/yuanli.woff2` },
            { name: 'MotoyaMaru', url: `${this.basePath}font/motoyamaru.woff2` }
        ];
        const fontPromises = fontList.map(async (f) => {
            try {
                const font = new FontFace(f.name, `url(${f.url})`);
                await font.load();
                document.fonts.add(font);
            } catch (e) {
                console.warn(`Failed to load font: ${f.name}`, e);
            }
        });

        const borders = ['shen', 'wei', 'shu', 'wu', 'qun', 'jin'];
        const borderPromises = borders.map(name => new Promise(resolve => {
            const img = new Image();
            img.src = `${this.basePath}assets/border/${name}.png`;
            img.onload = () => { this.loadedImages.border[name] = img; resolve(); };
            img.onerror = () => { console.warn(`Failed border: ${name}`); resolve(); };
        }));

        const heartTypes = ['', '_armor', '_empty'];
        const heartPromises = [];
        borders.forEach(faction => {
            heartTypes.forEach(type => {
                heartPromises.push(new Promise(resolve => {
                    const filename = `${faction}${type}`;
                    const img = new Image();
                    img.src = `${this.basePath}assets/heart/${filename}.png`;
                    img.onload = () => { this.loadedImages.heart[filename] = img; resolve(); };
                    img.onerror = () => { console.warn(`Failed heart: ${filename}`); resolve(); };
                }));
            });
        });

        const skillPromises = borders.map(name => new Promise(resolve => {
            const img = new Image();
            img.src = `${this.basePath}assets/skill/${name}.png`;
            img.onload = () => { this.loadedImages.skill[name] = img; resolve(); };
            img.onerror = () => { console.warn(`Failed skill: ${name}`); resolve(); };
        }));

        const bottomPromise = new Promise(resolve => {
            const img = new Image();
            img.src = `${this.basePath}assets/border/bottom.png`;
            img.onload = () => { this.loadedImages.bottom = img; resolve(); };
            img.onerror = () => { console.warn('Failed bottom.png'); resolve(); };
        });

        await Promise.all([...fontPromises, ...borderPromises, ...heartPromises, ...skillPromises, bottomPromise]);
        await document.fonts.ready;
        this.resourcesLoaded = true;
        console.log("Resources loaded");
    }

    async loadArtImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { this.loadedImages.art = img; resolve(img); };
            img.onerror = () => reject(new Error('Failed to load art image'));
            img.src = imageUrl;
        });
    }

    async generateCard(config) {
        if (!this.resourcesLoaded) await this.loadResources();
        if (config.artImage) await this.loadArtImage(config.artImage);

        const RENDER_SCALE = 3;
        this.canvas.width = this.CONFIG.width * RENDER_SCALE;
        this.canvas.height = this.CONFIG.height * RENDER_SCALE;
        this.ctx.scale(RENDER_SCALE, RENDER_SCALE);

        const normalizedFaction = this.FACTION_NORMALIZE[config.faction] || config.faction || '神';
        const theme = this.FACTION_THEMES[normalizedFaction] || this.FACTION_THEMES['神'];
        Object.assign(this.CONFIG.theme, theme);

        const data = {
            faction: normalizedFaction,
            hp: config.hp || 4,
            maxHp: config.maxHp || 4,
            armor: config.armor || 0,
            title: config.title || '',
            name: config.name || '',
            skills: config.skills || [],
            flavor: config.flavor || '',
            titleFont: config.titleFont || 'XiaoZhuan',
            nameFont: config.nameFont || 'XingKai',
            titleColor: config.titleColor || '#fff100',
            nameColor: config.nameColor || 'white',
            hideFaction: config.hideFaction || false,
            enableCustomBorder: config.enableCustomBorder || false,
            borderColor: config.borderColor || '#8c8c8c',
            layouts: this.deepMerge(this.LAYOUT_DEFAULTS, config.layouts || {}),
            selected: config.selected || null,
            highlight: config.highlight || null
        };

        this.drawCard(data);
        return new Promise((resolve) => {
            this.canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), 'image/png');
        });
    }

    drawCard(data) {
        const W = this.CONFIG.width;
        const H = this.CONFIG.height;
        this.ctx.clearRect(0, 0, W, H);
        this.ctx.save();
        // Removed rounded corner clipping

        this.drawArt(W, H);
        const layout = this.calculateSkillLayout(data);
        this.drawFrameImage(W, H, data);

        // Draw components with individual rotation
        this.drawRotated('heroInfo', data, () => this.drawHeroInfo(data));
        if (!data.hideFaction) {
            this.drawRotated('faction', data, () => this.drawFaction(data));
        }
        this.drawRotated('hp', data, () => this.drawHP(data));

        // Skill components
        this.drawRotated('skillBox', data, () => this.drawSkillBox(data, layout));
        this.drawRotated('skillTags', data, () => this.drawSkillTags(data, layout));
        this.drawRotated('skillText', data, () => this.drawSkillText(data, layout));

        if (data.highlight || data.selected) {
            this.drawComponentControls(data.highlight, data.selected, data);
        }

        this.ctx.restore();
    }

    drawRotated(comp, data, drawFn) {
        const layout = (data.layouts || {})[comp];
        if (!layout || layout.rotation === 0) {
            drawFn();
            return;
        }
        const rect = this.getComponentRect(comp, data);
        if (!rect) {
            drawFn();
            return;
        }
        this.ctx.save();
        this.ctx.translate(rect.cx, rect.cy);
        this.ctx.rotate((layout.rotation * Math.PI) / 180);
        this.ctx.translate(-rect.cx, -rect.cy);
        drawFn();
        this.ctx.restore();
    }

    drawComponentControls(highlight, selected, data) {
        const drawBox = (comp, color, isSelected) => {
            const rect = this.getComponentRect(comp, data);
            if (!rect) return;

            this.ctx.save();
            this.ctx.translate(rect.cx, rect.cy);
            this.ctx.rotate((rect.rotation * Math.PI) / 180);

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            if (!isSelected) this.ctx.setLineDash([5, 5]);

            this.ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);

            if (isSelected) {
                // Draw resize/rotate nodes
                this.ctx.fillStyle = 'white';
                const nodeSize = 8;
                // South-East Resize Node
                this.ctx.fillRect(rect.w / 2 - nodeSize / 2, rect.h / 2 - nodeSize / 2, nodeSize, nodeSize);
                // Top Rotation Node
                this.ctx.beginPath();
                this.ctx.arc(0, -rect.h / 2 - 20, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            }
            this.ctx.restore();
        };

        if (highlight && highlight !== selected) drawBox(highlight, '#00ffcc', false);
        if (selected) drawBox(selected, '#ffcc00', true);
    }

    getComponentRect(comp, data) {
        const l = data.layouts[comp];
        if (!l) return null;

        let x, y, w, h;
        if (comp === 'heroInfo') {
            const titleLen = data.title.length;
            const nameLen = data.name.length;
            w = 80;
            h = titleLen * l.titleSpacing + 30 + nameLen * l.nameSpacing;
            x = l.x - w / 2; y = l.y;
        } else if (comp === 'faction') {
            w = l.size; h = l.size;
            x = l.x - w / 2; y = l.y - h / 2;
        } else if (comp === 'hp') {
            const maxHp = data.maxHp || data.hp;
            const totalIcons = maxHp + (data.armor || 0);

            if (totalIcons > 13) {
                // Compact format: estimate width based on text + icons
                w = 300; // Generous estimate for compact format
                h = l.size + 10;
                x = l.x - 5; y = l.y - 5;
            } else {
                // Use same auto-spacing logic as drawHP
                const maxWidth = 300;
                const baseWidth = totalIcons * (l.size * l.spacing);
                let actualSpacing = l.spacing;
                if (baseWidth > maxWidth) {
                    actualSpacing = maxWidth / (totalIcons * l.size);
                }

                w = totalIcons * (l.size * actualSpacing) + 20;
                h = l.size + 10;
                x = l.x - 5; y = l.y - 5;
            }
        } else if (comp === 'skillBox') {
            const layout = this.calculateSkillLayout(data);
            h = Math.max(l.h, layout.requiredBoxHeight);
            w = l.w; x = l.x; y = l.y + l.h - h;
        } else if (comp === 'skillTags' || comp === 'skillText') {
            const layout = this.calculateSkillLayout(data);
            const box = data.layouts.skillBox;
            const drawH = Math.max(box.h, layout.requiredBoxHeight);
            h = layout.totalHeight;
            w = (comp === 'skillTags') ? l.w : (395 - l.x);
            x = l.x; y = box.y + box.h - drawH + 15;
        }

        return {
            x, y, w, h,
            cx: x + w / 2,
            cy: y + h / 2,
            rotation: l.rotation || 0
        };
    }

    drawArt(W, H) {
        const img = this.loadedImages.art;
        if (img) {
            const imgRatio = img.width / img.height;
            const cardRatio = W / H;
            let drawW, drawH, drawX, drawY;
            if (imgRatio > cardRatio) {
                drawH = H; drawW = H * imgRatio; drawX = (W - drawW) / 2; drawY = 0;
            } else {
                drawW = W; drawH = W / imgRatio; drawX = 0; drawY = (H - drawH) / 2;
            }
            this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else {
            this.ctx.fillStyle = '#221111'; // Solid color, no gradient
            this.ctx.fillRect(0, 0, W, H);
        }
    }

    drawFrameImage(W, H, data) {
        const key = this.CONFIG.assets.border[data.faction] || 'shen';
        let img = this.loadedImages.border[key];

        if (data.enableCustomBorder && data.borderColor) {
            const template = this.loadedImages.border['qun'];
            if (template) {
                // Use scratchpad to avoid clipping main canvas
                this.scratchCanvas.width = W;
                this.scratchCanvas.height = H;
                const sctx = this.scratchCtx;
                sctx.clearRect(0, 0, W, H);

                // 1. Draw solid color
                sctx.fillStyle = data.borderColor;
                sctx.fillRect(0, 0, W, H);
                // 2. Use grayscale image with multiply
                sctx.globalCompositeOperation = 'multiply';
                sctx.drawImage(template, 0, 0, W, H);
                // 3. Draw template again with 'destination-in' to keep alpha
                sctx.globalCompositeOperation = 'destination-in';
                sctx.drawImage(template, 0, 0, W, H);

                this.ctx.drawImage(this.scratchCanvas, 0, 0, W, H);
                return;
            }
        }

        if (img) this.ctx.drawImage(img, 0, 0, W, H);
        else {
            this.ctx.lineWidth = 4; this.ctx.strokeStyle = this.CONFIG.theme.border;
            this.ctx.strokeRect(12, 12, W - 24, H - 24);
        }
    }

    drawHeroInfo(data) {
        const layout = data.layouts.heroInfo;
        const x = layout.x; const y = layout.y;
        this.ctx.save();
        this.ctx.font = `${layout.titleSize}px "${data.titleFont}"`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top'; // Anchor at top
        this.ctx.shadowColor = 'black'; this.ctx.shadowBlur = 0;
        this.ctx.lineWidth = 2; this.ctx.strokeStyle = 'black'; this.ctx.fillStyle = data.titleColor;
        for (let i = 0; i < data.title.length; i++) {
            const charY = y + i * layout.titleSpacing;
            this.ctx.strokeText(data.title[i], x, charY); this.ctx.fillText(data.title[i], x, charY);
        }
        const nameY = y + data.title.length * layout.titleSpacing + 30;
        this.ctx.font = `${layout.nameSize}px "${data.nameFont}"`;
        this.ctx.strokeStyle = 'black'; this.ctx.lineWidth = 3; this.ctx.lineJoin = 'round';
        this.ctx.shadowColor = 'black'; this.ctx.shadowBlur = 4;
        for (let i = 0; i < data.name.length; i++) {
            const charY = nameY + i * layout.nameSpacing;
            this.ctx.strokeText(data.name[i], x, charY);
            this.ctx.fillStyle = data.nameColor; this.ctx.fillText(data.name[i], x, charY);
        }
        this.ctx.restore();
    }

    calculateSkillLayout(data) {
        const sTags = data.layouts.skillTags;
        const sText = data.layouts.skillText;
        const visibleSkills = (data.skills || []).filter(s => !s.hidden);

        const boxWidth = 390 - sText.x;

        let fontSize = 12, lineHeight = 16, spacing = 8;
        const MAX_HEIGHT = 500;
        let layoutResult = null;
        const configs = [{ fs: 12, lh: 16, sp: 8 }, { fs: 11, lh: 14, sp: 6 }, { fs: 10, lh: 12, sp: 4 }, { fs: 9, lh: 11, sp: 2 }];

        for (const config of configs) {
            fontSize = config.fs; lineHeight = config.lh; spacing = config.sp;
            this.ctx.font = `500 ${fontSize}px "MotoyaMaru"`;
            let totalH = 0;
            const skillBlocks = visibleSkills.map(skill => {
                let desc = (skill.type && skill.type !== '普通技') ? `[b]${skill.type}[/b]，${skill.desc}` : skill.desc;
                const lines = this.wrapText(this.parseRichText(desc), boxWidth);
                const textHeight = lines.length * lineHeight;
                const blockHeight = Math.max(textHeight, sTags.h);
                totalH += blockHeight + spacing;
                return { skill, lines, height: blockHeight };
            });
            if (skillBlocks.length > 0) totalH -= spacing;

            // Auto-growth logic: box needs space for top padding (15px) and bottom padding (35px for flavor/image)
            const requiredBoxHeight = totalH + 50;

            layoutResult = { boxWidth, totalHeight: totalH, requiredBoxHeight, skillBlocks, descFont: `500 ${fontSize}px "MotoyaMaru"`, descLineH: lineHeight, fontSize, spacing };
            if (totalH <= MAX_HEIGHT) break;
        }
        return layoutResult;
    }

    drawSkillBox(data, layout) {
        const l = data.layouts.skillBox;
        const drawH = Math.max(l.h, layout.requiredBoxHeight);
        const drawY = l.y + l.h - drawH; // Anchor to bottom

        this.ctx.save();
        this.ctx.fillStyle = this.CONFIG.theme.skillBoxBg;
        this.ctx.fillRect(l.x, drawY, l.w, drawH);

        // Draw flavor and bottom relative to box
        this.ctx.font = 'italic 11px "Songti SC", serif';
        this.ctx.fillStyle = '#444';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(data.flavor, l.x + l.w - 10, drawY + drawH - 18);

        const bLayout = data.layouts.bottom;
        if (this.loadedImages.bottom) {
            const h = bLayout.height;
            const w = this.loadedImages.bottom.width * (h / this.loadedImages.bottom.height);
            this.ctx.drawImage(this.loadedImages.bottom, l.x + (l.w - w) / 2, drawY + drawH - h + bLayout.yOffset, w, h);
        }
        this.ctx.restore();
    }

    drawSkillTags(data, layout) {
        const l = data.layouts.skillTags;
        const box = data.layouts.skillBox;
        const drawH = Math.max(box.h, layout.requiredBoxHeight);
        const drawYBase = box.y + box.h - drawH + 15; // 15px top padding

        let currY = drawYBase;
        layout.skillBlocks.forEach(block => {
            this.drawTag(l.x, currY, l.w, l.h, block.skill.name, data);
            currY += block.height + layout.spacing;
        });
    }

    drawSkillText(data, layout) {
        const l = data.layouts.skillText;
        const sTags = data.layouts.skillTags;
        const box = data.layouts.skillBox;
        const drawH = Math.max(box.h, layout.requiredBoxHeight);
        const drawYBase = box.y + box.h - drawH + 15; // 15px top padding

        let currY = drawYBase;
        this.ctx.save();
        this.ctx.textBaseline = 'middle';
        layout.skillBlocks.forEach(block => {
            // Perfect vertical sync with tag center
            const firstLineCenterY = currY + sTags.h / 2;
            block.lines.forEach((line, lineIdx) => {
                // Keep the first line at tag center, others follow line height
                let textY = firstLineCenterY + lineIdx * layout.descLineH;
                let cursor = l.x;
                line.forEach(chunk => {
                    this.ctx.font = chunk.bold ? `600 ${layout.fontSize}px "MotoyaMaru"` : layout.descFont;
                    this.ctx.fillStyle = (chunk.color === '#f0f0f0' || chunk.color === this.CONFIG.theme.skillText) ? '#1a1a1a' : chunk.color;
                    this.ctx.fillText(chunk.text, cursor, textY);
                    cursor += this.ctx.measureText(chunk.text).width;
                });
            });
            currY += block.height + layout.spacing;
        });
        this.ctx.restore();
    }

    drawTag(x, y, w, h, text, data) {
        const key = this.CONFIG.assets.skill[data.faction] || 'shen';
        let img = this.loadedImages.skill[key] || this.loadedImages.skill['shen'];

        this.ctx.save();

        if (data.enableCustomBorder && data.borderColor) {
            const template = this.loadedImages.skill['qun'];
            if (template) {
                this.scratchCanvas.width = w;
                this.scratchCanvas.height = h;
                const sctx = this.scratchCtx;
                sctx.clearRect(0, 0, w, h);

                // Draw template
                sctx.drawImage(template, 0, 0, w, h);

                // Get pixel data to replace pure black with border color
                const imageData = sctx.getImageData(0, 0, w, h);
                const pixels = imageData.data;
                const targetColor = this.hexToRgb(data.borderColor);

                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const a = pixels[i + 3];

                    // Replace black and near-black pixels with border color
                    // Using threshold to catch anti-aliasing edges and compression artifacts
                    if (r < 30 && g < 30 && b < 30 && a > 0) {
                        pixels[i] = targetColor.r;
                        pixels[i + 1] = targetColor.g;
                        pixels[i + 2] = targetColor.b;
                    }
                }

                sctx.putImageData(imageData, 0, 0);
                this.ctx.drawImage(this.scratchCanvas, x, y, w, h);
                img = null; // Don't draw original
            }
        }

        if (img) this.ctx.drawImage(img, x, y, w, h);
        else if (!(data.enableCustomBorder && data.borderColor)) {
            this.ctx.fillStyle = '#eee'; this.ctx.fillRect(x, y, w, h);
        }
        this.ctx.font = '600 18px "ShouSha"'; this.ctx.fillStyle = 'black'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.save(); this.ctx.scale(1.15, 1); this.ctx.letterSpacing = '1.5px';
        this.ctx.fillText(text, (x + w * 0.44) / 1.10, y + h / 2); this.ctx.restore(); this.ctx.restore();
    }

    drawFaction(data) {
        const layout = data.layouts.faction;
        this.ctx.save(); this.ctx.shadowBlur = 4; this.ctx.shadowColor = 'black'; this.ctx.fillStyle = 'white';
        this.ctx.font = `${layout.size}px "HuangCao"`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.translate(layout.x, layout.y); this.ctx.lineWidth = 4; this.ctx.strokeStyle = 'black'; this.ctx.lineJoin = 'round';
        this.ctx.strokeText(data.faction, 0, 0); this.ctx.fillText(data.faction, 0, 0); this.ctx.restore();
    }

    drawHP(data) {
        const layout = data.layouts.hp;
        const maxHp = data.maxHp || data.hp;
        const totalIcons = maxHp + (data.armor || 0);

        // Use compact format when total > 13
        if (totalIcons > 13) {
            this.ctx.save();
            let currentX = layout.x;
            const iconSize = layout.size;
            const spacing = 8; // Fixed spacing between groups

            // Draw HP icon + count
            if (data.hp > 0) {
                const key = `${this.CONFIG.assets.border[data.faction] || 'shen'}`;
                this.drawMagatama(currentX, layout.y, iconSize, key);
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.textBaseline = 'middle';
                const text = ` × ${data.hp}`;
                this.ctx.strokeText(text, currentX + iconSize + 2, layout.y + iconSize / 2);
                this.ctx.fillText(text, currentX + iconSize + 2, layout.y + iconSize / 2);
                currentX += iconSize + this.ctx.measureText(text).width + spacing;
            }

            // Draw empty HP icon + count (if any)
            if (maxHp > data.hp) {
                const key = `${this.CONFIG.assets.border[data.faction] || 'shen'}_empty`;
                this.drawMagatama(currentX, layout.y, iconSize, key);
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = '#999';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.textBaseline = 'middle';
                const text = ` × ${maxHp - data.hp}`;
                this.ctx.strokeText(text, currentX + iconSize + 2, layout.y + iconSize / 2);
                this.ctx.fillText(text, currentX + iconSize + 2, layout.y + iconSize / 2);
                currentX += iconSize + this.ctx.measureText(text).width + spacing;
            }

            // Draw armor icon + count (if any)
            if (data.armor > 0) {
                const key = `${this.CONFIG.assets.border[data.faction] || 'shen'}_armor`;
                this.drawMagatama(currentX, layout.y, iconSize, key);
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = '#4af';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.textBaseline = 'middle';
                const text = ` × ${data.armor}`;
                this.ctx.strokeText(text, currentX + iconSize + 2, layout.y + iconSize / 2);
                this.ctx.fillText(text, currentX + iconSize + 2, layout.y + iconSize / 2);
            }

            this.ctx.restore();
        } else {
            // Original rendering for <= 13 icons
            // Auto-adjust spacing to fit within max width
            const maxWidth = 300;
            const baseWidth = totalIcons * (layout.size * layout.spacing);
            let actualSpacing = layout.spacing;

            if (baseWidth > maxWidth) {
                // Reduce spacing to fit within maxWidth
                actualSpacing = maxWidth / (totalIcons * layout.size);
            }

            this.ctx.save();
            for (let i = 0; i < maxHp; i++) {
                const key = `${this.CONFIG.assets.border[data.faction] || 'shen'}${i >= data.hp ? '_empty' : ''}`;
                this.drawMagatama(layout.x + i * (layout.size * actualSpacing), layout.y, layout.size, key);
            }
            for (let i = 0; i < (data.armor || 0); i++) {
                const key = `${this.CONFIG.assets.border[data.faction] || 'shen'}_armor`;
                this.drawMagatama(layout.x + (maxHp + i) * (layout.size * actualSpacing), layout.y, layout.size, key);
            }
            this.ctx.restore();
        }
    }

    drawMagatama(x, y, size, key) {
        const img = this.loadedImages.heart[key];
        if (img) this.ctx.drawImage(img, x, y, size, size);
        else { this.ctx.fillStyle = 'red'; this.ctx.fillRect(x, y, size, size); }
    }

    parseRichText(text) {
        const regex = /\[(\w+)\](.*?)\[\/\1\]/g;
        let lastIndex = 0, match, result = [];
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) result.push({ text: text.substring(lastIndex, match.index), color: this.CONFIG.theme.skillText, bold: false });
            result.push({ text: match[2], color: match[1] === 'red' ? '#b00' : this.CONFIG.theme.skillText, bold: match[1] === 'b' });
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) result.push({ text: text.substring(lastIndex), color: this.CONFIG.theme.skillText, bold: false });
        return result;
    }

    wrapText(tokens, maxWidth) {
        const lines = []; let currentLine = [], currentW = 0;
        tokens.forEach(token => {
            const chars = token.text.split('');
            let bufferStr = '', bufferW = 0;
            chars.forEach(char => {
                const w = this.ctx.measureText(char).width;
                if (currentW + bufferW + w > maxWidth) {
                    currentLine.push({ text: bufferStr, color: token.color, bold: token.bold });
                    lines.push(currentLine); currentLine = []; currentW = 0; bufferStr = char; bufferW = w;
                } else { bufferStr += char; bufferW += w; }
            });
            if (bufferStr) { currentLine.push({ text: bufferStr, color: token.color, bold: token.bold }); currentW += bufferW; }
        });
        if (currentLine.length > 0) lines.push(currentLine);
        return lines;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = this.deepMerge(target[key], source[key]);
                } else { Object.assign(output, { [key]: source[key] }); }
            });
        }
        return output;
    }
}

function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }

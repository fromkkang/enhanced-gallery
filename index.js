import { getContext } from '../../../extensions.js';

let currentImages = []; 
let selectedImages = new Set();
let favoriteImages = new Set(JSON.parse(localStorage.getItem('advGalleryFavs')) || []);
let isSelectMode = false;
let currentPage = 1, itemsPerPage = 8, currentLightboxIndex = 0;

const template = `
<div id="adv-gallery-popup" style="display:none; position:fixed; top:5vh; left:5vw; width:90vw; height:90vh; min-width:320px; min-height:400px; resize:both; overflow:hidden; background:var(--SmartThemeBlurTintColor, #1a1a1a); backdrop-filter:blur(10px); border:1px solid var(--SmartThemeBorderColor, #444); border-radius:12px; z-index:9999; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    
    <div id="adv-gallery-controls" style="display:flex; align-items:center; gap:8px; padding:10px; border-bottom:1px solid var(--SmartThemeBorderColor, #444); background:rgba(0,0,0,0.2); overflow-x:auto; flex-shrink:0; white-space:nowrap;">
        
        <select class="adv-ctrl-item" id="adv-char-select" title="캐릭터 선택" style="padding:5px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:1px solid #555;">
            <option value="">👤 캐릭터 선택</option>
        </select>
        <span id="adv-char-size" style="font-size:12px; opacity:0.6; padding-right:5px;"></span>
        
        <select class="adv-ctrl-item" id="adv-sort-select" title="정렬" style="padding:5px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:1px solid #555;">
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="size">용량순</option>
        </select>
        
        <select class="adv-ctrl-item" id="adv-grid-select" title="화면 표시 장수" style="padding:5px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:1px solid #555;">
            <option value="4">4장 보기</option><option value="8" selected>8장 보기</option><option value="20">20장 보기</option>
        </select>
        
        <div style="margin-left:auto; display:flex; gap:8px;">
            <button class="adv-ctrl-item" id="adv-btn-select" title="다중 선택 모드" style="width:32px; height:32px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:1px solid #555; cursor:pointer;"><i class="fa-solid fa-check-double"></i></button>
            <button class="adv-ctrl-item" id="adv-btn-close" title="닫기" style="width:32px; height:32px; border-radius:5px; background:rgba(255,77,77,0.2); color:#ff4d4d; border:1px solid rgba(255,77,77,0.5); cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
    </div>

    <div id="adv-selection-actions" style="display:none; padding:8px 10px; gap:10px; align-items:center; background:rgba(255,64,129,0.15); border-bottom:1px solid #ff4081; flex-shrink:0; overflow-x:auto; white-space:nowrap;">
        <button class="adv-ctrl-item" id="adv-btn-sel-all" style="padding:5px 10px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:none; cursor:pointer;"><i class="fa-solid fa-check-square"></i> 전체선택</button>
        <button class="adv-ctrl-item" id="adv-btn-del-sel" style="padding:5px 10px; border-radius:5px; background:rgba(255,77,77,0.2); color:#ff4d4d; border:none; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i> 삭제(<span id="adv-sel-count">0</span>)</button>
        <button class="adv-ctrl-item" id="adv-btn-del-unsel" style="padding:5px 10px; border-radius:5px; background:rgba(255,165,0,0.2); color:orange; border:none; cursor:pointer;"><i class="fa-solid fa-triangle-exclamation"></i> 제외삭제</button>
        <button class="adv-ctrl-item" id="adv-btn-save-sel" style="padding:5px 10px; border-radius:5px; background:rgba(76,175,80,0.2); color:#4caf50; border:none; cursor:pointer;"><i class="fa-solid fa-download"></i> 저장</button>
    </div>

    <div id="adv-gallery-container" style="flex-grow:1; overflow-y:auto; padding:15px; display:grid; gap:10px; grid-template-columns:repeat(var(--columns, 4), 1fr); align-content:start;"></div>

    <div id="adv-pagination" style="display:flex; justify-content:center; gap:15px; padding:10px; border-top:1px solid var(--SmartThemeBorderColor, #444); background:rgba(0,0,0,0.2); flex-shrink:0;">
        <button class="adv-ctrl-item" id="adv-btn-prev-page" style="width:36px; height:30px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:none; cursor:pointer;"><i class="fa-solid fa-chevron-left"></i></button>
        <span id="adv-page-info" style="align-self:center; font-size:13px; opacity:0.8;">1 / 1</span>
        <button class="adv-ctrl-item" id="adv-btn-next-page" style="width:36px; height:30px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:none; cursor:pointer;"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
</div>

<div id="adv-lightbox" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:10000; flex-direction:column; justify-content:center; align-items:center;">
    <img id="adv-lightbox-img" src="" style="max-width:90vw; max-height:80vh; object-fit:contain; border-radius:8px;">
    <div id="adv-lightbox-nav" style="position:absolute; bottom:20px; display:flex; gap:15px;">
        <button class="adv-nav-btn" id="adv-nav-left" style="padding:10px 15px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; cursor:pointer; backdrop-filter:blur(5px);"><i class="fa-solid fa-chevron-left"></i> 이전</button>
        <button class="adv-nav-btn" id="adv-btn-copy-prompt" style="padding:10px 15px; background:rgba(255,213,79,0.2); color:#ffd54f; font-weight:bold; border:1px solid rgba(255,213,79,0.5); border-radius:8px; cursor:pointer;"><i class="fa-solid fa-clipboard"></i> 프롬프트 복사</button>
        <button class="adv-nav-btn" id="adv-nav-right" style="padding:10px 15px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; cursor:pointer; backdrop-filter:blur(5px);">다음 <i class="fa-solid fa-chevron-right"></i></button>
    </div>
</div>
`;

window.advGalleryCache = {};

// 1. 메뉴 버튼 추가 (안전 장치 추가)
function addWandMenuButtons() {
    const injectTimer = setInterval(() => {
        const extMenu = document.getElementById('extensionsMenu');
        if (extMenu) {
            if (!document.getElementById('adv-gallery-menu-btn')) {
                const btn = document.createElement('div');
                btn.id = 'adv-gallery-menu-btn';
                btn.className = 'list-group-item flex-container flexGap5';
                btn.innerHTML = '<div class="fa-solid fa-images extensionsMenuExtensionButton" style="color:#ff4081;"></div><span>갤러리</span>';

                btn.addEventListener('click', function () {
                    document.getElementById('adv-gallery-popup').style.display = 'flex';
                    document.getElementById('extensionsMenuButton')?.click();
                    populateCharacters(); // 열 때마다 캐릭터 목록 갱신
                });
                extMenu.appendChild(btn);
            }
            clearInterval(injectTimer);
        }
    }, 500); // UI가 준비될 때까지 0.5초마다 체크 후 등록
}

// 2. 캐릭터 목록 생성
function populateCharacters() {
    const select = document.getElementById('adv-char-select');
    const currentVal = select.value;
    select.innerHTML = '<option value="">👤 캐릭터 선택</option>';
    
    const context = getContext();
    if (context.characters) {
        // 실리태번 기본 정렬(최근에 대화한 순서) 유지
        context.characters.forEach(c => {
            select.innerHTML += `<option value="${c.avatar}">${c.name}</option>`;
        });
    }

    if (currentVal) {
        select.value = currentVal;
    }
}

// 3. ★ 핵심: 렉 없이 빠르고 정확하게 서버 폴더에서 이미지 긁어오기 (오류 완벽 수정)
async function loadAndSortImages() {
    const select = document.getElementById('adv-char-select');
    const avatarName = select.value;
    const container = document.getElementById('adv-gallery-container');
    document.getElementById('adv-char-size').innerText = '';
    
    if (!avatarName) { 
        currentImages = []; 
        applySortAndRender(); 
        return; 
    }

    // [수정된 부분] HTML에서 가져오지 않고, ST 기본 메모리에서 100% 안전하게 캐릭터 이름을 추출합니다.
    const context = getContext();
    const charData = context.characters.find(c => c.avatar === avatarName);
    const charName = charData ? charData.name : "";

    container.innerHTML = '<p style="text-align:center; padding-top:40px; color:#ff4081; grid-column:1/-1;">서버에서 이미지를 불러오는 중입니다...</p>';
    
    try {
        // 원본 갤러리 익스텐션이 사용하는 정규 API 규격 (POST /api/images/get)
        const res = await fetch('/api/images/get', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-Token': context.csrf_token
            },
            body: JSON.stringify({ 
                avatar: avatarName, 
                ch_name: charName // 이제 절대 null이 되지 않고 정상적으로 서버에 전달됩니다.
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            currentImages = Array.isArray(data) ? data : (data.images || []);
        } else {
            throw new Error(`API 오류: ${res.status}`);
        }
    } catch (e) {
        console.error("갤러리 로드 실패:", e);
        currentImages = [];
    }

    if (currentImages.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding-top:40px; color:#aaa; grid-column:1/-1;">이 캐릭터의 폴더에 저장된 갤러리 이미지가 없습니다.</p>';
        return;
    }

    applySortAndRender();
}

// 4. 정렬 로직 적용
function applySortAndRender() {
    const sortType = document.getElementById('adv-sort-select').value;
    
    // 서버가 넘겨주는 데이터는 폴더 안의 파일 순서(오래된순)입니다.
    if (sortType === 'newest') {
        currentImages.reverse();
    } else if (sortType === 'oldest') {
        currentImages.sort();
    } else if (sortType === 'size') {
        currentImages.sort((a, b) => b.length - a.length);
    }

    currentPage = 1;
    selectedImages.clear();
    document.getElementById('adv-sel-count').innerText = '0';
    
    renderGrid();
    calculateTotalSize(currentImages);
}

// 5. 그리드 렌더링
function renderGrid() {
    const container = document.getElementById('adv-gallery-container');
    if(!currentImages || currentImages.length === 0) return;
    
    container.innerHTML = '';
    container.style.setProperty('--columns', itemsPerPage == 4 ? 2 : (itemsPerPage == 8 ? 4 : 6));

    const totalPages = Math.ceil(currentImages.length / itemsPerPage) || 1;
    document.getElementById('adv-page-info').textContent = `${currentPage} / ${totalPages}`;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageImages = currentImages.slice(startIdx, startIdx + itemsPerPage);

    pageImages.forEach((src, idx) => {
        const card = document.createElement('div');
        card.style.cssText = `position:relative; aspect-ratio:1/1; border-radius:10px; overflow:hidden; background:rgba(0,0,0,0.3); cursor:pointer; transition:transform 0.1s; border: 2px solid ${selectedImages.has(src) ? '#ff4081' : 'transparent'};`;
        card.onmouseover = () => card.style.transform = 'scale(1.03)';
        card.onmouseout = () => card.style.transform = 'scale(1)';

        const favBtn = document.createElement('button');
        favBtn.innerHTML = favoriteImages.has(src) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        favBtn.style.cssText = `position:absolute; top:5px; left:5px; width:28px; height:28px; background:rgba(0,0,0,0.5); border:none; border-radius:50%; color:${favoriteImages.has(src) ? '#ffd54f' : 'white'}; cursor:pointer; z-index:10; font-size:12px;`;
        
        favBtn.onclick = (e) => {
            e.stopPropagation();
            if (favoriteImages.has(src)) favoriteImages.delete(src); else favoriteImages.add(src);
            localStorage.setItem('advGalleryFavs', JSON.stringify([...favoriteImages]));
            favBtn.innerHTML = favoriteImages.has(src) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
            favBtn.style.color = favoriteImages.has(src) ? '#ffd54f' : 'white';
        };

        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = "width:100%; height:100%; object-fit:cover;";
        
        card.appendChild(favBtn);
        card.appendChild(img);

        if(selectedImages.has(src)) {
            const check = document.createElement('div');
            check.innerHTML = '<i class="fa-solid fa-check"></i>';
            check.style.cssText = 'position:absolute; top:5px; right:5px; width:24px; height:24px; background:#ff4081; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;';
            card.appendChild(check);
        }

        card.onclick = () => {
            if (isSelectMode) {
                if (selectedImages.has(src)) selectedImages.delete(src); else selectedImages.add(src);
                document.getElementById('adv-sel-count').innerText = selectedImages.size;
                renderGrid(); 
            } else {
                currentLightboxIndex = startIdx + idx;
                document.getElementById('adv-lightbox-img').src = src;
                document.getElementById('adv-lightbox').style.display = 'flex';
            }
        };
        container.appendChild(card);
    });
}

// 용량 계산
async function calculateTotalSize(images) {
    const sizeSpan = document.getElementById('adv-char-size');
    if (images.length === 0) { sizeSpan.innerText = '(0MB)'; return; }

    sizeSpan.innerText = '(계산 중...)';
    let totalSize = 0;
    try {
        for (let i = 0; i < images.length; i += 20) {
            const chunk = images.slice(i, i + 20);
            await Promise.all(chunk.map(async (src) => {
                try {
                    const res = await fetch(src, { method: 'HEAD' });
                    const size = res.headers.get('content-length');
                    if (size) totalSize += parseInt(size, 10);
                } catch(e) {}
            }));
        }
        sizeSpan.innerText = `(${(totalSize / (1024 * 1024)).toFixed(2)}MB)`;
    } catch(e) { sizeSpan.innerText = '(계산 실패)'; }
}

// 6. 이벤트 바인딩
function bindEvents() {
    document.getElementById('adv-btn-close').onclick = () => {
        document.getElementById('adv-gallery-popup').style.display = 'none';
        isSelectMode = false;
        document.getElementById('adv-btn-select').style.background = 'rgba(255,255,255,0.1)';
        document.getElementById('adv-selection-actions').style.display = 'none';
    };

    document.getElementById('adv-char-select').onchange = () => loadAndSortImages();
    document.getElementById('adv-sort-select').onchange = () => applySortAndRender();
    document.getElementById('adv-grid-select').onchange = (e) => { itemsPerPage = parseInt(e.target.value); renderGrid(); };

    document.getElementById('adv-btn-prev-page').onclick = () => { if(currentPage > 1) { currentPage--; renderGrid(); } };
    document.getElementById('adv-btn-next-page').onclick = () => { if(currentPage < Math.ceil(currentImages.length/itemsPerPage)) { currentPage++; renderGrid(); } };

    document.getElementById('adv-btn-select').onclick = (e) => {
        isSelectMode = !isSelectMode;
        e.currentTarget.style.background = isSelectMode ? 'rgba(255,64,129,0.5)' : 'rgba(255,255,255,0.1)';
        document.getElementById('adv-selection-actions').style.display = isSelectMode ? 'flex' : 'none';
        selectedImages.clear(); 
        document.getElementById('adv-sel-count').innerText = '0'; 
        renderGrid();
    };

    document.getElementById('adv-btn-sel-all').onclick = () => {
        currentImages.forEach(src => selectedImages.add(src));
        document.getElementById('adv-sel-count').innerText = selectedImages.size; 
        renderGrid();
    };
    
    document.getElementById('adv-btn-del-sel').onclick = () => deleteTargetImages(Array.from(selectedImages));
    document.getElementById('adv-btn-del-unsel').onclick = () => deleteTargetImages(currentImages.filter(src => !selectedImages.has(src)));
    
    document.getElementById('adv-btn-save-sel').onclick = () => {
        if(selectedImages.size === 0) { alert('저장할 이미지를 선택해주세요.'); return; }
        selectedImages.forEach(src => {
            const a = document.createElement('a'); 
            a.href = src; 
            a.download = src.split('/').pop();
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a);
        });
    };

    document.getElementById('adv-nav-left').onclick = (e) => { e.stopPropagation(); navLightbox(-1); };
    document.getElementById('adv-nav-right').onclick = (e) => { e.stopPropagation(); navLightbox(1); };
    document.getElementById('adv-lightbox').onclick = (e) => { if(e.target.id === 'adv-lightbox') e.target.style.display = 'none'; };

    // 프롬프트 복사
    document.getElementById('adv-btn-copy-prompt').onclick = async (e) => {
        e.stopPropagation();
        const imgSrc = document.getElementById('adv-lightbox-img').src;
        try {
            const context = getContext();
            const res = await fetch('/api/images/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': context.csrf_token },
                body: JSON.stringify({ avatar: imgSrc.split('/').pop() })
            });
            let promptText = "";
            if (res.ok) {
                const metadata = await res.json();
                promptText = metadata.prompt || metadata.description || "메타데이터가 존재하지 않습니다.";
            } else {
                promptText = "메타데이터를 가져오지 못했습니다.";
            }
            await navigator.clipboard.writeText(promptText);
            alert("프롬프트가 클립보드에 복사되었습니다.");
        } catch (err) {
            alert("복사 오류가 발생했습니다.");
        }
    };
}

function navLightbox(dir) {
    currentLightboxIndex += dir;
    if (currentLightboxIndex < 0) currentLightboxIndex = currentImages.length - 1;
    if (currentLightboxIndex >= currentImages.length) currentLightboxIndex = 0;
    document.getElementById('adv-lightbox-img').src = currentImages[currentLightboxIndex];
}

async function deleteTargetImages(targetArray) {
    const toDelete = targetArray.filter(src => !favoriteImages.has(src));
    if (toDelete.length === 0) return alert("삭제할 이미지가 없거나 모두 ⭐ 즐겨찾기로 보호되어 있습니다.");

    if (!confirm(`즐겨찾기된 이미지를 제외한 ${toDelete.length}장을 서버에서 완전히 삭제합니다. 진행할까요?`)) return;

    for (let src of toDelete) {
        await fetch('/api/images/delete', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getContext().csrf_token}, 
            body: JSON.stringify({path: src}) 
        });
        
        currentImages = currentImages.filter(img => img !== src);
    }
    
    selectedImages.clear(); 
    document.getElementById('adv-sel-count').innerText = '0';
    renderGrid();
    calculateTotalSize(currentImages);
    alert('삭제 완료!');
}

jQuery(function () {
    document.body.insertAdjacentHTML('beforeend', template);
    addWandMenuButtons();
    bindEvents();
});

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

// 1. 메뉴 버튼 추가 (실리태번 UI 렌더링을 기다린 후 안전하게 추가)
function addWandMenuButtons() {
    const extMenu = document.getElementById('extensionsMenu');
    if (!extMenu) return;

    if (!document.getElementById('adv-gallery-menu-btn')) {
        const btn = document.createElement('div');
        btn.id = 'adv-gallery-menu-btn';
        btn.className = 'list-group-item flex-container flexGap5';
        btn.innerHTML = '<div class="fa-solid fa-images extensionsMenuExtensionButton" style="color:#ff4081;"></div><span>갤러리</span>';

        btn.addEventListener('click', function () {
            document.getElementById('adv-gallery-popup').style.display = 'flex';
            document.getElementById('extensionsMenuButton')?.click();
            populateCharacters(); // 갤러리 열 때 캐릭터 목록 갱신
        });
        extMenu.appendChild(btn);
    }
}

// 2. 캐릭터 목록 채우기 (서버에 무리를 주지 않기 위해 실리태번 기본 변수 사용)
function populateCharacters() {
    const select = document.getElementById('adv-char-select');
    const context = getContext();
    
    // 현재 선택된 값을 유지하기 위해 기록
    const currentVal = select.value;
    select.innerHTML = '<option value="">👤 캐릭터 선택</option>';
    
    if (context.characters) {
        // 실리태번의 context.characters는 이미 기본적으로 '최근 대화순'으로 정렬되어 있습니다.
        context.characters.forEach(c => {
            select.innerHTML += `<option value="${c.avatar}" data-chname="${c.name}">${c.name}</option>`;
        });
    }

    if (currentVal) {
        select.value = currentVal;
    }
}

// 3. ★ 완벽한 순정 API 방식으로 해당 캐릭터의 이미지만 가져오기
async function loadAndSortImages() {
    const select = document.getElementById('adv-char-select');
    const avatarName = select.value;
    const charName = select.options[select.selectedIndex]?.getAttribute('data-chname');
    const container = document.getElementById('adv-gallery-container');
    document.getElementById('adv-char-size').innerText = '';
    
    if (!avatarName) { 
        currentImages = []; 
        applySortAndRender(); 
        return; 
    }

    container.innerHTML = '<p style="text-align:center; padding-top:40px; color:#ff4081; grid-column:1/-1;">서버에서 이미지를 불러오는 중입니다...</p>';
    
    try {
        const context = getContext();
        
        // 원본 갤러리 익스텐션과 완벽히 동일한 API 호출 (POST /api/images/get)
        const res = await fetch('/api/images/get', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-Token': context.csrf_token // 필수 보안 토큰
            },
            body: JSON.stringify({ 
                avatar: avatarName, 
                ch_name: charName 
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            // 서버가 배열로 주거나 { images: [...] } 형태로 줌
            currentImages = Array.isArray(data) ? data : (data.images || []);
        } else {
            throw new Error(`API 오류: ${res.status}`);
        }
    } catch (e) {
        console.error("갤러리 로드 실패:", e);
        currentImages = [];
    }

    if (currentImages.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding-top:40px; color:#aaa; grid-column:1/-1;">이 캐릭터의 폴더에 저장된 이미지가 없습니다.</p>';
        return;
    }

    applySortAndRender();
}

// 4. 정렬 적용 및 렌더링
function applySortAndRender() {
    const sortType = document.getElementById('adv-sort-select').value;
    
    // 서버가 주는 데이터는 보통 파일 생성순(오래된 순)
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

// 5. 화면에 썸네일 그리기
function renderGrid() {
    const container = document.getElementById('adv-gallery-container');
    if(!currentImages || currentImages.length === 0) return;
    
    container.innerHTML = '';
    container.style.setProperty('--columns', itemsPerPage == 4 ? 2

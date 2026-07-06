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
            <option value="">데이터 분석 중...</option>
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

window.advGalleryFolderMap = {}; // 폴더별 이미지를 캐싱할 객체

// 1. 메뉴 버튼 추가
function addWandMenuButtons() {
    var menu = document.getElementById('extensionsMenu');
    if (!menu) return;

    if (!document.getElementById('adv-gallery-menu-btn')) {
        var btn = document.createElement('div');
        btn.id = 'adv-gallery-menu-btn';
        btn.className = 'list-group-item flex-container flexGap5';
        btn.innerHTML = '<div class="fa-solid fa-images extensionsMenuExtensionButton" style="color:#ff4081;"></div><span>갤러리</span>';

        btn.addEventListener('click', async function () {
            document.getElementById('adv-gallery-popup').style.display = 'flex';
            document.getElementById('extensionsMenuButton')?.click();
            await fetchGlobalImagesAndFilterChars(); // 열 때마다 최신 목록 스캔
        });
        menu.appendChild(btn);
    }
}

// 2. ★ 핵심: 렉 없이 파일 스캔 + 이미지가 있는 캐릭터만 + 최신순 정렬
async function fetchGlobalImagesAndFilterChars() {
    const select = document.getElementById('adv-char-select');
    select.innerHTML = '<option value="">데이터 수집 중...</option>';

    try {
        // 실리태번의 갤러리 이미지 전체 경로를 가져오는 진짜 GET API 호출
        const res = await fetch('/api/images/get', { method: 'GET' });
        if (!res.ok) throw new Error("이미지 목록을 불러오지 못했습니다.");
        
        const data = await res.json();
        const allPaths = Array.isArray(data) ? data : (data.images || []);

        window.advGalleryFolderMap = {};
        let folderLastSeenIndex = {}; // 어떤 폴더에 이미지가 가장 마지막에(최근에) 저장되었는지 기록

        // 1) 전체 경로를 분석해서 폴더명(캐릭터명)별로 이미지를 분류
        allPaths.forEach((path, index) => {
            if (typeof path !== 'string') return;
            const normalizedPath = path.replace(/\\/g, '/');
            
            // 정규식: /images/ 뒤에 나오는 폴더명 추출
            const match = normalizedPath.match(/\/images\/([^/]+)\//i);
            if (match) {
                const folderName = match[1];
                if (!window.advGalleryFolderMap[folderName]) {
                    window.advGalleryFolderMap[folderName] = [];
                }
                window.advGalleryFolderMap[folderName].push(path);
                // 배열의 뒤로 갈수록 최신 이미지이므로 index 덮어쓰기
                folderLastSeenIndex[folderName] = index; 
            }
        });

        // 2) 실리태번에 등록된 캐릭터와 폴더명 매칭
        const context = getContext();
        let validChars = []; // 이미지가 존재하는 캐릭터만 담을 배열

        if (context.characters) {
            const availableFolders = Object.keys(window.advGalleryFolderMap);

            context.characters.forEach(c => {
                const charName = c.name || "";
                const avatarBase = (c.avatar || "").replace(/\.[^/.]+$/, "");

                // 폴더 이름이 캐릭터 이름이나 아바타 파일명과 일치하는지 확인 (대소문자 무시)
                const matchedFolder = availableFolders.find(f => 
                    f.toLowerCase() === charName.toLowerCase() || 
                    f.toLowerCase() === avatarBase.toLowerCase()
                );

                if (matchedFolder) {
                    validChars.push({
                        name: charName,
                        folder: matchedFolder,
                        lastIndex: folderLastSeenIndex[matchedFolder] // 정렬용 점수
                    });
                }
            });
        }

        // 3) 최신순 정렬 (최근에 이미지가 추가된 캐릭터가 맨 위로)
        validChars.sort((a, b) => b.lastIndex - a.lastIndex);

        // 4) 드롭다운 메뉴 렌더링
        if (validChars.length === 0) {
            select.innerHTML = '<option value="">이미지가 있는 캐릭터가 없습니다</option>';
            currentImages = [];
            renderGrid();
            return;
        }

        select.innerHTML = '<option value="">👤 캐릭터 선택</option>';
        validChars.forEach(c => {
            select.innerHTML += `<option value="${c.folder}">${c.name}</option>`;
        });

    } catch (e) {
        console.error("갤러리 스캔 오류:", e);
        select.innerHTML = '<option value="">오류 발생 (F12 콘솔 확인)</option>';
    }
}

// 3. 캐릭터 선택 시 메모리(캐시)에서 이미지 즉시 렌더링
function loadAndSortImages(folderName) {
    document.getElementById('adv-char-size').innerText = '';
    
    if (!folderName || !window.advGalleryFolderMap[folderName]) {
        currentImages = [];
        renderGrid();
        return;
    }

    // 캐싱된 배열 가져오기
    currentImages = [...window.advGalleryFolderMap[folderName]];
    
    const sortType = document.getElementById('adv-sort-select').value;
    
    // 서버가 주는 원본이 오래된순(oldest)이므로, 최신순은 reverse만 하면 됨
    if (sortType === 'newest') currentImages.reverse();
    else if (sortType === 'oldest') { /* 유지 */ }
    else if (sortType === 'size') currentImages.sort((a, b) => b.length - a.length);

    currentPage = 1;
    resetSelection();
    renderGrid();
    calculateTotalSize(currentImages);
}

// 화면 그리기
function renderGrid() {
    const container = document.getElementById('adv-gallery-container');

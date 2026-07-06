import { getContext } from '../../../extensions.js';

let currentImages = []; // 현재 선택된 캐릭터의 이미지들
let selectedImages = new Set();
let favoriteImages = new Set(JSON.parse(localStorage.getItem('advGalleryFavs')) || []);
let isSelectMode = false;
let currentPage = 1, itemsPerPage = 8, currentLightboxIndex = 0;

// 모바일 최적화 및 FontAwesome 아이콘 적용된 템플릿
const template = `
<div id="adv-gallery-popup" style="display:none; position:fixed; top:5vh; left:5vw; width:90vw; height:90vh; min-width:320px; min-height:400px; resize:both; overflow:hidden; background:var(--SmartThemeBlurTintColor, #1a1a1a); backdrop-filter:blur(10px); border:1px solid var(--SmartThemeBorderColor, #444); border-radius:12px; z-index:9999; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    
    <!-- 상단 컨트롤 바 -->
    <div id="adv-gallery-controls" style="display:flex; align-items:center; gap:8px; padding:10px; border-bottom:1px solid var(--SmartThemeBorderColor, #444); background:rgba(0,0,0,0.2); overflow-x:auto; flex-shrink:0; white-space:nowrap;">
        
        <select class="adv-ctrl-item" id="adv-char-select" title="캐릭터 선택" style="padding:5px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:1px solid #555;">
            <option value="">로딩중...</option>
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
        
        <!-- 우측 아이콘 버튼들 -->
        <div style="margin-left:auto; display:flex; gap:8px;">
            <button class="adv-ctrl-item" id="adv-btn-select" title="다중 선택 모드" style="width:32px; height:32px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:1px solid #555; cursor:pointer;"><i class="fa-solid fa-check-double"></i></button>
            <button class="adv-ctrl-item" id="adv-btn-close" title="닫기" style="width:32px; height:32px; border-radius:5px; background:rgba(255,77,77,0.2); color:#ff4d4d; border:1px solid rgba(255,77,77,0.5); cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
    </div>

    <!-- 다중 선택 모드 액션 바 -->
    <div id="adv-selection-actions" style="display:none; padding:8px 10px; gap:10px; align-items:center; background:rgba(255,64,129,0.15); border-bottom:1px solid #ff4081; flex-shrink:0; overflow-x:auto; white-space:nowrap;">
        <button class="adv-ctrl-item" id="adv-btn-sel-all" style="padding:5px 10px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:none; cursor:pointer;"><i class="fa-solid fa-check-square"></i> 전체선택</button>
        <button class="adv-ctrl-item" id="adv-btn-del-sel" style="padding:5px 10px; border-radius:5px; background:rgba(255,77,77,0.2); color:#ff4d4d; border:none; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i> 삭제(<span id="adv-sel-count">0</span>)</button>
        <button class="adv-ctrl-item" id="adv-btn-del-unsel" style="padding:5px 10px; border-radius:5px; background:rgba(255,165,0,0.2); color:orange; border:none; cursor:pointer;"><i class="fa-solid fa-triangle-exclamation"></i> 제외삭제</button>
        <button class="adv-ctrl-item" id="adv-btn-save-sel" style="padding:5px 10px; border-radius:5px; background:rgba(76,175,80,0.2); color:#4caf50; border:none; cursor:pointer;"><i class="fa-solid fa-download"></i> 저장</button>
    </div>

    <!-- 이미지 그리드 영역 -->
    <div id="adv-gallery-container" style="flex-grow:1; overflow-y:auto; padding:15px; display:grid; gap:10px; grid-template-columns:repeat(var(--columns, 4), 1fr); align-content:start;"></div>

    <!-- 하단 페이징 -->
    <div id="adv-pagination" style="display:flex; justify-content:center; gap:15px; padding:10px; border-top:1px solid var(--SmartThemeBorderColor, #444); background:rgba(0,0,0,0.2); flex-shrink:0;">
        <button class="adv-ctrl-item" id="adv-btn-prev-page" style="width:36px; height:30px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:none; cursor:pointer;"><i class="fa-solid fa-chevron-left"></i></button>
        <span id="adv-page-info" style="align-self:center; font-size:13px; opacity:0.8;">1 / 1</span>
        <button class="adv-ctrl-item" id="adv-btn-next-page" style="width:36px; height:30px; border-radius:5px; background:rgba(255,255,255,0.1); color:inherit; border:none; cursor:pointer;"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
</div>

<!-- 라이트박스 (크게보기) -->
<div id="adv-lightbox" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:10000; flex-direction:column; justify-content:center; align-items:center;">
    <img id="adv-lightbox-img" src="" style="max-width:90vw; max-height:80vh; object-fit:contain; border-radius:8px;">
    <div id="adv-lightbox-nav" style="position:absolute; bottom:20px; display:flex; gap:15px;">
        <button class="adv-nav-btn" id="adv-nav-left" style="padding:10px 15px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; cursor:pointer; backdrop-filter:blur(5px);"><i class="fa-solid fa-chevron-left"></i> 이전</button>
        <button class="adv-nav-btn" id="adv-btn-copy-prompt" style="padding:10px 15px; background:rgba(255,213,79,0.2); color:#ffd54f; font-weight:bold; border:1px solid rgba(255,213,79,0.5); border-radius:8px; cursor:pointer;"><i class="fa-solid fa-clipboard"></i> 프롬프트 복사</button>
        <button class="adv-nav-btn" id="adv-nav-right" style="padding:10px 15px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; cursor:pointer; backdrop-filter:blur(5px);">다음 <i class="fa-solid fa-chevron-right"></i></button>
    </div>
</div>
`;

// 갤러리 캐싱용 전역 변수
window.advGalleryCache = {};

// 메뉴 추가 함수
function addWandMenuButtons() {
    var menu = document.getElementById('extensionsMenu');
    if (!menu) return;

    if (!document.getElementById('adv-gallery-menu-btn')) {
        var btn = document.createElement('div');
        btn.id = 'adv-gallery-menu-btn';
        btn.className = 'list-group-item flex-container flexGap5';
        btn.innerHTML = '<div class="fa-solid fa-images extensionsMenuExtensionButton"></div><span>갤러리</span>';

        btn.addEventListener('click', async function () {
            document.getElementById('adv-gallery-popup').style.display = 'flex';
            document.getElementById('extensionsMenuButton')?.click();
            await fetchAllImagesAndPopulateChars(); // 열 때마다 최신 데이터 로드
        });

        menu.appendChild(btn);
    }
}

// 실리태번 원본 갤러리 API와 완벽 호환되는 방식으로 이미지 불러오기
async function fetchAllImagesAndPopulateChars() {
    const select = document.getElementById('adv-char-select');
    select.innerHTML = '<option value="">폴더 스캔 중...</option>';

    const context = getContext();
    if (!context.characters || context.characters.length === 0) {
        select.innerHTML = '<option value="">캐릭터가 없습니다</option>';
        return;
    }

    try {
        // 병렬로 모든 캐릭터의 이미지 폴더를 스캔합니다 (ST POST API 규격 준수)
        const fetchPromises = context.characters.map(async (c) => {
            try {
                const res = await fetch('/api/images/get', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar: c.avatar, ch_name: c.name })
                });

                if (res.ok) {
                    const data = await res.json();
                    const images = Array.isArray(data) ? data : (data.images || []);
                    if (images.length > 0) {
                        return {
                            name: c.name,
                            avatar: c.avatar,
                            images: images,
                            // 최신 이미지(보통 배열의 마지막 요소)를 저장해 정렬 기준으로 사용
                            lastImageName: images[images.length - 1] 
                        };
                    }
                }
            } catch (err) { }
            return null;
        });

        // 스캔 결과 합치기
        const results = await Promise.all(fetchPromises);
        const validChars = results.filter(r => r !== null);

        if (validChars.length === 0) {
            select.innerHTML = '<option value="">이미지가 있는 캐릭터 없음</option>';
            return;
        }

        // 가장 최근에 이미지가 추가된 캐릭터 순으로 정렬 (문자열 역순 비교)
        validChars.sort((a, b) => b.lastImageName.localeCompare(a.lastImageName));

        // 데이터 캐싱 및 드롭다운 생성
        select.innerHTML = '<option value="">👤 캐릭터 선택</option>';
        window.advGalleryCache = {}; 

        validChars.forEach(c => {
            window.advGalleryCache[c.avatar] = c.images; // 아바타 파일명을 키(Key)로 캐싱
            select.innerHTML += `<option value="${c.avatar}">${c.name}</option>`;
        });

    } catch (e) {
        console.error("갤러리 스캔 중 오류:", e);
        select.innerHTML = '<option value="">오류 발생 (F12 콘솔 확인)</option>';
    }
}

// 선택된 캐릭터 이미지를 화면에 띄우기
function loadAndSortImages(avatarName) {
    document.getElementById('adv-char-size').innerText = '';
    
    // 캐싱된 배열에서 복사해오기
    if (!avatarName || !window.advGalleryCache[avatarName]) { 
        currentImages = []; 
        renderGrid(); 
        return; 
    }

    currentImages = [...window.advGalleryCache[avatarName]];
    const sortType = document.getElementById('adv-sort-select').value;
    
    if (sortType === 'newest') currentImages.reverse();
    else if (sortType === 'oldest') { /* ST 기본값이 oldest 이므로 그대로 유지 */ }
    else if (sortType === 'size') currentImages.sort((a, b) => b.length - a.length);

    currentPage = 1;
    resetSelection();
    renderGrid();
    calculateTotalSize(currentImages);
}

// 용량 계산 (MB)
async function calculateTotalSize(images) {
    const sizeSpan = document.getElementById('adv-char-size');
    if (images.length === 0) { sizeSpan.innerText = '(0MB)'; return; }

    sizeSpan.innerText = '(계산 중...)';
    let totalSize = 0;
    const chunkSize = 20;
    try {
        for (let i = 0; i < images.length; i += chunkSize) {
            const chunk = images.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (src) => {
                try {
                    const res = await fetch(src, { method: 'HEAD' });
                    const size = res.headers.get('content-length');
                    if (size) totalSize += parseInt(size, 10);
                } catch(e) {}
            }));
        }
        const mb = (totalSize / (1024 * 1024)).toFixed(2);
        sizeSpan.innerText = `(${mb}MB)`;
    } catch(e) {
        sizeSpan.innerText = '(계산 실패)';
    }
}

// 화면 그리기
function renderGrid() {
    const container = document.getElementById('adv-gallery-container');
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

        // 선택모드 시 체크 아이콘 추가
        if(selectedImages.has(src)) {
            const check = document.createElement('div');
            check.innerHTML = '<i class="fa-solid fa-check"></i>';
            check.style.cssText = 'position:absolute; top:5px; right:5px; width:24px; height:24px; background:#ff4081; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;';
            card.appendChild(check);
        }

        card.onclick = () => {
            if (isSelectMode) {
                if (selectedImages.has(src)) selectedImages.delete(src);
                else selectedImages.add(src);
                document.getElementById('adv-sel-count').innerText = selectedImages.size;
                renderGrid(); // 다시 그려서 체크표시 업데이트
            } else {
                currentLightboxIndex = startIdx + idx;
                document.getElementById('adv-lightbox-img').src = src;
                document.getElementById('adv-lightbox').style.display = 'flex';
            }
        };
        container.appendChild(card);
    });
}

function resetSelection() {
    selectedImages.clear();
    document.getElementById('adv-sel-count').innerText = '0';
}

// 이벤트 바인딩
function bindEvents() {
    document.getElementById('adv-btn-close').onclick = () => document.getElementById('adv-gallery-popup').style.display = 'none';

    document.getElementById('adv-char-select').onchange = (e) => loadAndSortImages(e.target.value);
    document.getElementById('adv-sort-select').onchange = () => loadAndSortImages(document.getElementById('adv-char-select').value);
    document.getElementById('adv-grid-select').onchange = (e) => { itemsPerPage = parseInt(e.target.value); renderGrid(); };

    document.getElementById('adv-btn-prev-page').onclick = () => { if(currentPage > 1) { currentPage--; renderGrid(); } };
    document.getElementById('adv-btn-next-page').onclick = () => { if(currentPage < Math.ceil(currentImages.length/itemsPerPage)) { currentPage++; renderGrid(); } };

    // 다중 선택 버튼 토글
    document.getElementById('adv-btn-select').onclick = (e) => {
        isSelectMode = !isSelectMode;
        e.currentTarget.style.background = isSelectMode ? 'rgba(255,64,129,0.5)' : 'rgba(255,255,255,0.1)';
        document.getElementById('adv-selection-actions').style.display = isSelectMode ? 'flex' : 'none';
        resetSelection(); renderGrid();
    };

    // 액션 버튼
    document.getElementById('adv-btn-sel-all').onclick = () => {
        currentImages.forEach(src => selectedImages.add(src));
        document.getElementById('adv-sel-count').innerText = selectedImages.size; renderGrid();
    };
    document.getElementById('adv-btn-del-sel').onclick = () => deleteTargetImages(Array.from(selectedImages));
    document.getElementById('adv-btn-del-unsel').onclick = () => deleteTargetImages(currentImages.filter(src => !selectedImages.has(src)));
    document.getElementById('adv-btn-save-sel').onclick = () => {
        selectedImages.forEach(src => {
            const a = document.createElement('a'); a.href = src; a.download = src.split('/').pop();
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        });
    };

    // 라이트박스 닫기 및 이동
    document.getElementById('adv-nav-left').onclick = (e) => { e.stopPropagation(); navLightbox(-1); };
    document.getElementById('adv-nav-right').onclick = (e) => { e.stopPropagation(); navLightbox(1); };
    document.getElementById('adv-lightbox').onclick = (e) => { if(e.target.id === 'adv-lightbox') e.target.style.display = 'none'; };

    // 프롬프트 클립보드 복사
    document.getElementById('adv-btn-copy-prompt').onclick = async (e) => {
        e.stopPropagation();
        const imgSrc = document.getElementById('adv-lightbox-img').src;
        try {
            const res = await fetch('/api/images/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            await navigator.clipboard.writeText("메타데이터 추출 오류 발생");
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

    if (!confirm(`즐겨찾기된 이미지를 제외한 ${toDelete.length}장을 영구 삭제합니다. 진행할까요?`)) return;

    for (let src of toDelete) {
        await fetch('/api/images/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({path: src}) });
        
        // 현재 리스트에서 삭제
        currentImages = currentImages.filter(img => img !== src);
        
        // 캐싱된 전체 데이터에서도 즉시 삭제해줘야 캐릭터를 다시 눌렀을 때 부활하지 않음
        const currentAvatar = document.getElementById('adv-char-select').value;
        if(currentAvatar && window.advGalleryCache[currentAvatar]) {
            window.advGalleryCache[currentAvatar] = window.advGalleryCache[currentAvatar].filter(img => img !== src);
        }
    }
    
    resetSelection();
    renderGrid();
    calculateTotalSize(currentImages);
    alert('삭제 완료!');
}

// 초기화 로직
jQuery(async function () {
    document.body.insertAdjacentHTML('beforeend', template);
    addWandMenuButtons();
    bindEvents();
});

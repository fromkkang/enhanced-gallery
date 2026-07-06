import { getContext, extension_settings } from "../../../extensions.js";

// 상태 변수
let currentImages = []; // 현재 로드된 전체 이미지 리스트
let selectedImages = new Set();
let isSelectMode = false;
let isMetaMode = false;

// 페이징 관련 상태
let currentPage = 1;
let itemsPerPage = 8;
let currentLightboxIndex = 0; // 좌우 이동을 위한 인덱스

// UI HTML 템플릿
const template = `
<div id="adv-gallery-popup" style="display:none;">
    <div id="adv-gallery-controls">
        <div style="display:flex; gap:10px; align-items:center;">
            <label>캐릭터:</label>
            <select id="adv-char-select"><option value="">캐릭터를 선택하세요</option></select>
            
            <label>보기:</label>
            <select id="adv-grid-select">
                <option value="4">4장 보기 (크게)</option>
                <option value="8" selected>8장 보기 (중간)</option>
                <option value="20">20장 보기 (작게)</option>
                <option value="50">50장 보기 (매우 작게)</option>
            </select>
        </div>
        <div>
            <button id="adv-btn-meta">📝 프롬프트 보기: OFF</button>
            <button id="adv-btn-select">✅ 선택 모드: OFF</button>
            <button id="adv-btn-close">❌ 닫기</button>
        </div>
    </div>
    
    <!-- 선택 모드 시 나타나는 액션 바 (요구사항 5) -->
    <div id="adv-selection-actions">
        <button id="adv-btn-sel-all">전체 선택</button>
        <button id="adv-btn-del-sel" class="btn-danger">🗑️ 선택 삭제 (<span id="adv-sel-count">0</span>)</button>
        <button id="adv-btn-save-sel" class="btn-success">💾 선택 저장</button>
        <button id="adv-btn-del-unsel" class="btn-warning">⚠️ 선택 제외 전부 삭제</button>
    </div>

    <div id="adv-gallery-container"></div>
    
    <div id="adv-pagination">
        <button id="adv-btn-prev-page">◀ 이전 페이지</button>
        <span id="adv-page-info">페이지 1 / 1</span>
        <button id="adv-btn-next-page">다음 페이지 ▶</button>
    </div>
</div>

<div id="adv-lightbox">
    <button id="adv-nav-left" class="adv-nav-btn">◀</button>
    <img id="adv-lightbox-img" src="">
    <button id="adv-nav-right" class="adv-nav-btn">▶</button>
</div>
`;

// ==========================================
// 1. 초기화 및 UI 생성
// ==========================================
async function init() {
    document.body.insertAdjacentHTML('beforeend', template);

    // ST 상단 확장 메뉴(톱니바퀴)에 갤러리 열기 버튼 삽입
    // setInterval을 써서 ST UI가 완전히 렌더링된 후 버튼을 넣음 (버그 방지)
    const injectBtn = setInterval(() => {
        const extMenu = document.getElementById('extensionsMenu');
        if (extMenu) {
            const btn = document.createElement('div');
            btn.className = 'list-group-item flex-container flexGap5';
            btn.innerHTML = `<span>🎨 고급 캐릭터 갤러리</span>`;
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', openGallery);
            extMenu.appendChild(btn);
            clearInterval(injectBtn);
        }
    }, 1000);

    bindEvents();
}

// ==========================================
// 2. 갤러리 열기 & 캐릭터 목록 로드
// ==========================================
function openGallery() {
    document.getElementById('adv-gallery-popup').style.display = 'flex';
    
    // ST 전역 변수 'characters' 활용 (요구사항 2: 캐릭터 목록)
    const context = getContext();
    const charSelect = document.getElementById('adv-char-select');
    charSelect.innerHTML = '<option value="">캐릭터를 선택하세요</option>';
    
    if (context.characters && context.characters.length > 0) {
        context.characters.forEach(char => {
            const opt = document.createElement('option');
            opt.value = char.avatar; // 보통 아바타 이미지 이름 기반으로 폴더가 생성됨
            opt.textContent = char.name;
            charSelect.appendChild(opt);
        });
    }
}

// ==========================================
// 3. 서버에서 이미지 가져오기
// ==========================================
async function loadCharacterImages(charAvatarName) {
    if (!charAvatarName) return;
    currentImages = [];
    currentPage = 1;
    resetSelection();

    try {
        // ST 내부 API 사용 (캐릭터별 채팅 이미지 가져오기)
        // 주의: ST 버전에 따라 엔드포인트가 약간 다를 수 있으나 보통 chat/images나 characters에 종속됨
        // 이 예제는 실리태번의 get api를 호출해 캐릭터 이름이 포함된 이미지를 필터링하는 방식입니다.
        const response = await fetch('/api/images/get'); 
        const data = await response.json();
        
        let allFiles = Array.isArray(data) ? data : (data.images || []);
        
        // 해당 캐릭터가 속한 이미지 필터링 로직 (실제 ST 파일 구조에 맞게 커스텀 필요할 수 있음)
        currentImages = allFiles.filter(img => img.includes(charAvatarName.split('.')[0]));
        
        renderGrid();
    } catch (e) {
        console.error("이미지 로드 실패", e);
        alert("이미지를 불러오는 중 오류가 발생했습니다.");
    }
}

// ==========================================
// 4. 화면 그리기 (페이징 & 그리드 크기)
// ==========================================
function renderGrid() {
    const container = document.getElementById('adv-gallery-container');
    container.innerHTML = '';
    
    // 그리드 열 수 동적 조절 (요구사항 4)
    let columns = itemsPerPage == 4 ? 2 : (itemsPerPage == 8 ? 4 : (itemsPerPage == 20 ? 5 : 8));
    container.style.setProperty('--columns', columns);

    // 페이징 계산
    const totalPages = Math.ceil(currentImages.length / itemsPerPage) || 1;
    document.getElementById('adv-page-info').textContent = `페이지 ${currentPage} / ${totalPages}`;
    
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageImages = currentImages.slice(startIdx, endIdx);

    pageImages.forEach((src, idx) => {
        const card = document.createElement('div');
        card.className = `adv-img-card ${selectedImages.has(src) ? 'selected' : ''}`;
        
        const img = document.createElement('img');
        img.src = src;
        
        // 프롬프트 메타데이터 영역 (요구사항 3)
        const meta = document.createElement('div');
        meta.className = 'adv-img-meta';
        meta.textContent = "프롬프트 데이터 로딩 불가 (가상 데이터)"; // *실제 메타데이터 추출 API 연동 필요*
        meta.style.display = isMetaMode ? 'block' : 'none';

        card.appendChild(img);
        card.appendChild(meta);
        container.appendChild(card);

        // 이미지 클릭 이벤트
        card.addEventListener('click', () => {
            if (isSelectMode) {
                // 선택 모드
                if (selectedImages.has(src)) {
                    selectedImages.delete(src);
                    card.classList.remove('selected');
                } else {
                    selectedImages.add(src);
                    card.classList.add('selected');
                }
                document.getElementById('adv-sel-count').textContent = selectedImages.size;
            } else {
                // 크게 보기 (요구사항 1)
                openLightbox(startIdx + idx);
            }
        });
    });
}

// ==========================================
// 5. 크게 보기 (라이트박스) 및 좌우 이동
// ==========================================
function openLightbox(index) {
    if(currentImages.length === 0) return;
    currentLightboxIndex = index;
    const lightbox = document.getElementById('adv-lightbox');
    document.getElementById('adv-lightbox-img').src = currentImages[currentLightboxIndex];
    lightbox.style.display = 'flex';
}

function navLightbox(direction) {
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = currentImages.length - 1;
    if (currentLightboxIndex >= currentImages.length) currentLightboxIndex = 0;
    document.getElementById('adv-lightbox-img').src = currentImages[currentLightboxIndex];
}

// ==========================================
// 6. 이벤트 바인딩
// ==========================================
function bindEvents() {
    // 닫기
    document.getElementById('adv-btn-close').addEventListener('click', () => {
        document.getElementById('adv-gallery-popup').style.display = 'none';
        resetSelection();
    });

    // 캐릭터 선택 변경 시 (요구사항 2)
    document.getElementById('adv-char-select').addEventListener('change', (e) => {
        loadCharacterImages(e.target.value);
    });

    // 보기 방식(페이징) 변경 시 (요구사항 4)
    document.getElementById('adv-grid-select').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderGrid();
    });

    // 페이징 버튼
    document.getElementById('adv-btn-prev-page').addEventListener('click', () => {
        if(currentPage > 1) { currentPage--; renderGrid(); }
    });
    document.getElementById('adv-btn-next-page').addEventListener('click', () => {
        const maxPage = Math.ceil(currentImages.length / itemsPerPage);
        if(currentPage < maxPage) { currentPage++; renderGrid(); }
    });

    // 메타데이터 토글 (요구사항 3)
    document.getElementById('adv-btn-meta').addEventListener('click', (e) => {
        isMetaMode = !isMetaMode;
        e.target.textContent = `📝 프롬프트 보기: ${isMetaMode ? 'ON' : 'OFF'}`;
        document.querySelectorAll('.adv-img-meta').forEach(el => el.style.display = isMetaMode ? 'block' : 'none');
    });

    // 선택 모드 토글 (요구사항 5)
    document.getElementById('adv-btn-select').addEventListener('click', (e) => {
        isSelectMode = !isSelectMode;
        e.target.textContent = `✅ 선택 모드: ${isSelectMode ? 'ON' : 'OFF'}`;
        document.getElementById('adv-selection-actions').style.display = isSelectMode ? 'flex' : 'none';
        if(!isSelectMode) resetSelection();
    });

    // --- 선택 액션 버튼들 (요구사항 5) ---
    document.getElementById('adv-btn-sel-all').addEventListener('click', () => {
        currentImages.forEach(src => selectedImages.add(src));
        document.getElementById('adv-sel-count').textContent = selectedImages.size;
        renderGrid();
    });

    document.getElementById('adv-btn-del-sel').addEventListener('click', () => deleteTargetImages(Array.from(selectedImages)));
    
    document.getElementById('adv-btn-del-unsel').addEventListener('click', () => {
        if(confirm("정말 선택된 이미지를 제외한 '모든' 이미지를 삭제할까요?")) {
            const unselected = currentImages.filter(src => !selectedImages.has(src));
            deleteTargetImages(unselected);
        }
    });

    document.getElementById('adv-btn-save-sel').addEventListener('click', downloadSelected);

    // --- 라이트박스 이벤트 (요구사항 1) ---
    document.getElementById('adv-nav-left').addEventListener('click', (e) => { e.stopPropagation(); navLightbox(-1); });
    document.getElementById('adv-nav-right').addEventListener('click', (e) => { e.stopPropagation(); navLightbox(1); });
    document.getElementById('adv-lightbox').addEventListener('click', (e) => {
        if(e.target.id === 'adv-lightbox') document.getElementById('adv-lightbox').style.display = 'none';
    });

    // 키보드 방향키 이동 (라이트박스가 열려있을 때만)
    document.addEventListener('keydown', (e) => {
        if(document.getElementById('adv-lightbox').style.display === 'flex') {
            if(e.key === 'ArrowLeft') navLightbox(-1);
            if(e.key === 'ArrowRight') navLightbox(1);
            if(e.key === 'Escape') document.getElementById('adv-lightbox').style.display = 'none';
        }
    });
}

// 선택 초기화 유틸리티
function resetSelection() {
    selectedImages.clear();
    document.getElementById('adv-sel-count').textContent = '0';
    document.querySelectorAll('.adv-img-card').forEach(c => c.classList.remove('selected'));
}

// 파일 다중 삭제 로직
async function deleteTargetImages(targetArray) {
    if(targetArray.length === 0) return;
    if(!confirm(`총 ${targetArray.length}장의 이미지를 삭제하시겠습니까?`)) return;

    for(let src of targetArray) {
        await fetch('/api/images/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path: src})
        });
        currentImages = currentImages.filter(img => img !== src);
    }
    
    resetSelection();
    renderGrid();
    alert('삭제가 완료되었습니다.');
}

// 파일 다중 저장(다운로드) 로직
function downloadSelected() {
    if(selectedImages.size === 0) return;
    selectedImages.forEach(src => {
        const a = document.createElement('a');
        a.href = src;
        a.download = src.split('/').pop(); // 파일명 추출
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

// ST 로드 시 실행
jQuery(document).ready(init);

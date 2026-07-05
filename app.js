const storeKey = "food-daily-widget-records-v3";
const backgroundKey = "food-daily-widget-background";
const appName = "今日贴贴";
const legacyKeys = ["inspiration-album-records-v2", "food-cutout-records-v1"];

const homeScreen = document.querySelector("#homeScreen");
const timelineScreen = document.querySelector("#timelineScreen");
const currentDateTitle = document.querySelector("#currentDateTitle");
const recordCount = document.querySelector("#recordCount");
const todayKcal = document.querySelector("#todayKcal");
const todayItems = document.querySelector("#todayItems");
const stickerLayer = document.querySelector("#stickerLayer");
const emptyBoard = document.querySelector("#emptyBoard");
const widgetBoard = document.querySelector("#widgetBoard");
const monthTitle = document.querySelector("#monthTitle");
const monthSubtitle = document.querySelector("#monthSubtitle");
const monthGrid = document.querySelector("#monthGrid");
const monthCupCount = document.querySelector("#monthCupCount");
const monthShopCount = document.querySelector("#monthShopCount");
const monthStickerStrip = document.querySelector("#monthStickerStrip");
const dailyWall = document.querySelector("#dailyWall");
const activityDateStrip = document.querySelector("#activityDateStrip");
const calendarPanel = document.querySelector("#calendarPanel");
const activityTitle = document.querySelector("#activityTitle");
const activitySubtitle = document.querySelector("#activitySubtitle");
const backgroundPicker = document.querySelector("#backgroundPicker");
const activityToolPanel = document.querySelector("#activityToolPanel");
const timelineList = document.querySelector("#timelineList");
const captureDialog = document.querySelector("#captureDialog");
const editDialog = document.querySelector("#editDialog");
const recordForm = document.querySelector("#recordForm");
const editForm = document.querySelector("#editForm");
const saveRecord = document.querySelector("#saveRecord");
const camera = document.querySelector("#camera");
const emptyState = document.querySelector("#emptyState");
const canvas = document.querySelector("#captureCanvas");
const cameraAction = document.querySelector("#cameraAction");
const fileInput = document.querySelector("#fileInput");
const cutoutPreview = document.querySelector("#cutoutPreview");
const smartBadge = document.querySelector("#smartBadge");
const recordDate = document.querySelector("#recordDate");
const recordTitle = document.querySelector("#recordTitle");
const recordKcal = document.querySelector("#recordKcal");
const recordShop = document.querySelector("#recordShop");
const importBackupInput = document.querySelector("#importBackup");

let selectedDate = today();
let displayMonth = selectedDate.slice(0, 7);
let cameraStream = null;
let currentOriginal = "";
let currentCutout = "";
let dragState = null;
let currentBackground = localStorage.getItem(backgroundKey) || "garden";
let captureReady = false;

migrateRecords();
recordDate.value = selectedDate;
backgroundPicker.value = currentBackground;
applyBackground();
renderAll();
document.title = appName;

bind("#prevDay", "click", () => changeDay(-1));
bind("#nextDay", "click", () => changeDay(1));
bind("#openTimeline", "click", showTimeline);
bind("#timelineNav", "click", showTimeline);
bind("#homeNav", "click", showHome);
bind("#backHome", "click", showHome);
bind("#openCapture", "click", openCapture);
bind("#closeCapture", "click", closeCapture);
bind("#clearForm", "click", resetCaptureForm);
bind("#installHelp", "click", showInstallHelp);
bind("#exportBackupHome", "click", exportBackup);
bind("#exportToday", "click", exportTodayImage);
bind("#exportMonth", "click", exportMonthImage);
bind("#exportBackup", "click", exportBackup);
bind("#toggleTools", "click", toggleToolsPanel);
bind("#prevMonth", "click", () => changeMonth(-1));
bind("#nextMonth", "click", () => changeMonth(1));
bind("#clearToday", "click", clearTodayRecords);
bind("#deleteEdit", "click", deleteEditingRecord);
bind("#toggleCalendar", "click", toggleCalendarPanel);
backgroundPicker.addEventListener("change", updateBackground);
importBackupInput.addEventListener("change", importBackup);

widgetBoard.addEventListener("pointermove", handleDragMove);
widgetBoard.addEventListener("pointerup", endDrag);
widgetBoard.addEventListener("pointercancel", endDrag);

stickerLayer.addEventListener("pointerdown", (event) => {
  const sticker = event.target.closest(".food-sticker");
  if (!sticker) return;
  const board = stickerLayer.getBoundingClientRect();
  const rect = sticker.getBoundingClientRect();
  dragState = {
    id: sticker.dataset.id,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    board,
  };
  sticker.setPointerCapture(event.pointerId);
});

stickerLayer.addEventListener("dblclick", (event) => {
  const sticker = event.target.closest(".food-sticker");
  if (sticker) openEdit(sticker.dataset.id);
});

timelineList.addEventListener("click", (event) => {
  const item = event.target.closest(".timeline-item[data-id]");
  if (item) openEdit(item.dataset.id);
});

activityDateStrip.addEventListener("click", (event) => {
  const item = event.target.closest("button[data-date]");
  if (!item) return;
  selectedDate = item.dataset.date;
  displayMonth = selectedDate.slice(0, 7);
  renderAll();
});
monthGrid.addEventListener("click", (event) => {
  const item = event.target.closest("button[data-date]");
  if (!item) return;
  selectedDate = item.dataset.date;
  displayMonth = selectedDate.slice(0, 7);
  renderAll();
});

cameraAction.addEventListener("click", async () => {
  if (captureReady) {
    resetCapturedPreview();
    await openCamera();
    return;
  }
  if (!cameraStream) {
    await openCamera();
    return;
  }
  await captureFromCamera();
});
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFile(file);
  await processSelectedImage(await compressDataUrl(dataUrl, 1300, 0.84));
});


recordTitle.addEventListener("input", updateSmartKcal);
recordKcal.addEventListener("input", () => {
  smartBadge.textContent = `${Number(recordKcal.value || 0)} kcal`;
  smartBadge.hidden = !recordKcal.value;
});

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentCutout) {
    alert("请先拍照或上传照片，等待自动抠图完成后再加入今日。");
    return;
  }
  saveRecord.disabled = true;
  saveRecord.textContent = "处理中";
  try {
    const title = recordTitle.value.trim() || "未命名食物";
    const kcal = Number(recordKcal.value || estimateCalories(title));
    const storedImage = await compressDataUrl(currentCutout, 680, 0.82);
    const records = loadRecords();
    const placement = nextStickerPlacement(recordsForDate(recordDate.value || selectedDate).length);
    records.unshift({
      id: crypto.randomUUID(),
      date: recordDate.value || selectedDate,
      title,
      kcal,
      shop: recordShop.value.trim(),
      background: currentBackground,
      cutout: storedImage,
      createdAt: new Date().toISOString(),
      x: placement.x,
      y: placement.y,
      rotate: placement.rotate,
    });
    saveRecords(records);
    selectedDate = recordDate.value || selectedDate;
    closeCapture();
    renderAll();
  } catch (error) {
    console.error(error);
    alert("保存失败：图片可能太大，请换一张较小图片或删除旧记录后再试。");
  } finally {
    saveRecord.disabled = false;
    saveRecord.textContent = "加入今日";
  }
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.querySelector("#editId").value;
  const records = loadRecords().map((record) => {
    if (record.id !== id) return record;
    return {
      ...record,
      date: document.querySelector("#editDate").value,
      title: document.querySelector("#editTitle").value.trim(),
      kcal: Number(document.querySelector("#editKcal").value || 0),
      shop: document.querySelector("#editShop").value.trim(),
    };
  });
  saveRecords(records);
  editDialog.close();
  renderAll();
});

function showInstallHelp() {
  alert("把今日贴贴安装到桌面：\n\n1. 先用手机浏览器打开 GitHub Pages 链接。\n2. iPhone：Safari 点分享按钮，再点添加到主屏幕。\n3. 安卓 Chrome：点右上角菜单，再点添加到主屏幕或安装应用。\n\n记录会保存在当前手机浏览器里，换设备前记得导出备份。");
}

function exportBackup() {
  const data = {
    app: appName,
    version: 1,
    exportedAt: new Date().toISOString(),
    background: currentBackground,
    records: loadRecords(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `今日贴贴备份-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const records = Array.isArray(backup) ? backup : backup.records;
    if (!Array.isArray(records)) throw new Error("Invalid backup");
    if (!confirm(`导入后会替换当前浏览器里的 ${loadRecords().length} 条记录，确定继续吗？`)) return;
    saveRecords(records);
    if (backup.background) {
      currentBackground = backup.background;
      localStorage.setItem(backgroundKey, currentBackground);
      backgroundPicker.value = currentBackground;
      applyBackground();
    }
    selectedDate = records[0]?.date || today();
    displayMonth = selectedDate.slice(0, 7);
    renderAll();
    alert("备份已导入。");
  } catch (error) {
    alert("导入失败，请确认选择的是今日贴贴导出的 JSON 备份文件。");
  } finally {
    event.target.value = "";
  }
}
function recordImage(record) {
  return record?.cutout || record?.image || record?.original || record?.photo || record?.src || "";
}

function renderAll() {
  renderHeader();
  renderStickers();
  renderMonthCalendar();
  renderActivityDateStrip();
  renderDailyWall();
  renderTimeline();
}

function renderHeader() {
  const records = recordsForDate(selectedDate);
  const kcal = totalKcal(records);
  currentDateTitle.textContent = dateTitle(selectedDate);
  recordCount.textContent = String(records.length);
  todayKcal.textContent = `${kcal} kcal`;
  todayItems.textContent = String(records.length);
}

function renderStickers() {
  const records = recordsForDate(selectedDate);
  emptyBoard.hidden = records.length > 0;
  stickerLayer.innerHTML = records.map((record) => `
    <article class="food-sticker" data-id="${record.id}" style="left:${record.x ?? 30}%; top:${record.y ?? 30}%; --rotate:${record.rotate ?? 0}deg; transform: rotate(var(--rotate));">
      <div class="sticker-image-wrap">
        <img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" />
        <span class="sticker-kcal">${record.kcal || 0} kcal</span>
      </div>
      <strong class="sticker-name">${escapeHtml(record.title)}</strong>
      <time class="sticker-time">${timeText(record.createdAt)}</time>
    </article>`).join("");
}

function renderMonthCalendar() {
  const records = loadRecords();
  const monthDate = new Date(`${displayMonth}-01T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthRecords = records.filter((record) => record.date?.startsWith(displayMonth));
  const daysWithRecords = new Set(monthRecords.map((record) => record.date));
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const cells = [];

  for (let i = 0; i < startDay; i += 1) cells.push(`<span class="month-cell empty-cell"></span>`);
  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${displayMonth}-${String(day).padStart(2, "0")}`;
    const dayRecords = recordsForDate(date);
    const preview = dayRecords.slice(0, 3);
    const active = date === selectedDate ? " active" : "";
    const scene = renderCalendarScene(dayRecords, day);
    cells.push(`
      <button class="month-cell${active}" type="button" data-date="${date}">
        ${scene}
        ${dayRecords.length > 0 ? `<i>${dayRecords.length}</i>` : ""}
      </button>`);
  }

  monthTitle.textContent = `${year}年${month + 1}月`;
  monthSubtitle.textContent = `${daysWithRecords.size} 天有记录 · ${monthRecords.length} 份食物`;
  monthCupCount.textContent = String(monthRecords.length);
  monthShopCount.textContent = `${daysWithRecords.size} 天有记录`;
  monthStickerStrip.innerHTML = monthRecords.slice(0, 10).map((record) => `<img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" />`).join("");
  monthGrid.innerHTML = cells.join("");
}

function renderCalendarScene(records, day, background = dayBackground(records)) {
  const stickers = records.slice(0, 6).map((record, index) => {
    const fallback = nextStickerPlacement(index);
    const x = record.x ?? fallback.x;
    const y = record.y ?? fallback.y;
    const rotate = record.rotate ?? fallback.rotate;
    return `<img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" style="left:${x}%; top:${y}%; transform: rotate(${rotate}deg);" />`;
  }).join("");
  return `
    <div class="month-day-scene" data-bg="${escapeAttr(background)}">
      <span class="month-day-number">${day}</span>
      <div class="month-scene-stickers">${stickers}</div>
    </div>`;
}
function dayBackground(records) {
  return records.find((record) => record.background)?.background || currentBackground;
}
function renderActivityDateStrip() {
  const dates = weekDates(selectedDate);
  activityDateStrip.innerHTML = dates.map((date) => {
    const dateValue = toDateInputValue(date);
    const records = recordsForDate(dateValue);
    const active = dateValue === selectedDate ? " active" : "";
    const hasRecords = records.length ? " has-records" : "";
    return `<button class="activity-date-pill${active}${hasRecords}" type="button" data-date="${dateValue}">
      <i>${records.length ? "✓" : ""}</i>
      <span>${weekday(date)}</span>
      <strong>${date.getDate()}</strong>
    </button>`;
  }).join("");
}
function renderDailyWall() {
  const records = recordsForDate(selectedDate);
  activityTitle.textContent = `${formatMonthDay(selectedDate)} 活动动态`;
  activitySubtitle.textContent = records.length ? `${records.length} 张贴纸 · ${totalKcal(records)} kcal` : "这一天还没有活动贴纸。";
  dailyWall.innerHTML = records.length ? records.map((record, index) => {
    const fallback = nextStickerPlacement(index);
    const x = record.x ?? fallback.x;
    const y = record.y ?? fallback.y;
    const rotate = record.rotate ?? fallback.rotate;
    return `
      <article class="daily-wall-sticker" style="left:${x}%; top:${y}%; --rotate:${rotate}deg; transform: rotate(var(--rotate));">
        <img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" />
        <strong>${escapeHtml(record.title)}</strong>
        <span>${timeText(record.createdAt)}</span>
      </article>`;
  }).join("") : "";
}

function renderTimeline() {
  const records = recordsForDate(selectedDate);
  timelineList.innerHTML = records.length ? records.map((record) => {
    const note = record.shop || record.notes || "";
    const title = record.title && record.title !== "未命名食物" ? record.title : "";
    return `
    <article class="timeline-item" data-id="${record.id}" role="button" tabindex="0">
      <div>
        <time class="timeline-time">${formatMonthDay(record.date)} ${timeText(record.createdAt)}</time>
        ${title ? `<strong class="timeline-title">${escapeHtml(title)}</strong>` : ""}
        ${note ? `<p class="timeline-note">${escapeHtml(note)}</p>` : ""}
      </div>
      <div class="timeline-image">
        <img src="${escapeAttr(recordImage(record))}" alt="${escapeAttr(record.title)}" />
        <span class="timeline-kcal">${record.kcal || 0} kcal</span>
      </div>
    </article>`;
  }).join("") : '<p class="timeline-note empty-timeline">这一天还没有活动记录。</p>';
}
function handleDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const sticker = stickerLayer.querySelector(`[data-id="${dragState.id}"]`);
  if (!sticker) return;
  const x = clamp(((event.clientX - dragState.board.left - dragState.offsetX) / dragState.board.width) * 100, 0, 78);
  const y = clamp(((event.clientY - dragState.board.top - dragState.offsetY) / dragState.board.height) * 100, 0, 78);
  sticker.style.left = `${x}%`;
  sticker.style.top = `${y}%`;
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const sticker = stickerLayer.querySelector(`[data-id="${dragState.id}"]`);
  if (sticker) {
    const records = loadRecords().map((record) => record.id === dragState.id ? {
      ...record,
      x: parseFloat(sticker.style.left),
      y: parseFloat(sticker.style.top),
    } : record);
    saveRecords(records);
  }
  dragState = null;
}

function resetCapturedPreview() {
  currentCutout = "";
  captureReady = false;
  cutoutPreview.removeAttribute("src");
  cutoutPreview.classList.remove("has-image");
  smartBadge.hidden = true;
  saveRecord.disabled = true;
  cameraAction.textContent = "打开相机";
}

function toggleToolsPanel() {
  activityToolPanel.classList.toggle("tools-open");
}
function openCapture() {
  recordDate.value = selectedDate;
  captureDialog.showModal();
}

function closeCapture() {
  stopCamera();
  resetCaptureForm();
  captureDialog.close();
}

function resetCaptureForm() {
  recordForm.reset();
  recordDate.value = selectedDate;
  currentOriginal = "";
  currentCutout = "";
  captureReady = false;
  cutoutPreview.removeAttribute("src");
  cutoutPreview.classList.remove("has-image");
  smartBadge.hidden = true;
  cameraAction.textContent = "打开相机";
  fileInput.value = "";
}
async function processSelectedImage(dataUrl) {
  currentOriginal = dataUrl;
  currentCutout = "";
  captureReady = false;
  cutoutPreview.removeAttribute("src");
  cutoutPreview.classList.remove("has-image");
  smartBadge.hidden = true;
  saveRecord.disabled = true;
  cameraAction.disabled = true;

  try {
    currentCutout = (await makeCutout(currentOriginal)).image;
    cutoutPreview.src = currentCutout;
    cutoutPreview.classList.add("has-image");
    captureReady = true;
    cameraAction.textContent = "重拍";
    stopCamera(false);
    updateSmartKcal();
  } catch (error) {
    console.error(error);
    alert("自动抠图失败，请换一张图片再试。");
  } finally {
    saveRecord.disabled = !currentCutout;
    cameraAction.disabled = false;
  }
}
function updateSmartKcal() {
  const title = recordTitle.value.trim() || "未命名食物";
  if (!recordKcal.value) recordKcal.value = estimateCalories(title);
  smartBadge.textContent = `${recordKcal.value} kcal`;
  smartBadge.hidden = false;
}

function openEdit(id) {
  const record = loadRecords().find((item) => item.id === id);
  if (!record) return;
  document.querySelector("#editId").value = record.id;
  document.querySelector("#editDate").value = record.date;
  document.querySelector("#editTitle").value = record.title || "";
  document.querySelector("#editKcal").value = record.kcal || 0;
  document.querySelector("#editShop").value = record.shop || record.notes || "";
  const preview = document.querySelector("#editPreview");
  const image = recordImage(record);
  if (image) {
    preview.setAttribute("src", image);
    preview.hidden = false;
  } else {
    preview.removeAttribute("src");
    preview.hidden = true;
  }
  editDialog.showModal();
}
function clearTodayRecords() {
  const count = recordsForDate(selectedDate).length;
  if (!count) return;
  if (!confirm(`确定删除 ${dateTitle(selectedDate)} 的 ${count} 条记录吗？`)) return;
  saveRecords(loadRecords().filter((record) => record.date !== selectedDate));
  renderAll();
}

function deleteEditingRecord() {
  const id = document.querySelector("#editId").value;
  if (!id) return;
  if (!confirm("确定删除这条记录吗？")) return;
  saveRecords(loadRecords().filter((record) => record.id !== id));
  editDialog.close();
  renderAll();
}
function deleteRecord(id) {
  if (!confirm("确定删除这条活动记录吗？")) return;
  saveRecords(loadRecords().filter((record) => record.id !== id));
  renderAll();
}

function showHome() {
  homeScreen.hidden = false;
  timelineScreen.hidden = true;
  document.querySelector("#homeNav").classList.add("nav-active");
  document.querySelector("#timelineNav").classList.remove("nav-active");
}

function showTimeline() {
  homeScreen.hidden = true;
  timelineScreen.hidden = false;
  document.querySelector("#homeNav").classList.remove("nav-active");
  document.querySelector("#timelineNav").classList.add("nav-active");
  displayMonth = selectedDate.slice(0, 7);
  renderAll();
}

function changeMonth(delta) {
  const date = new Date(`${displayMonth}-01T00:00:00`);
  date.setMonth(date.getMonth() + delta);
  displayMonth = toDateInputValue(date).slice(0, 7);
  selectedDate = `${displayMonth}-01`;
  renderAll();
}
function changeDay(delta) {
  const date = new Date(`${selectedDate}T00:00:00`);
  date.setDate(date.getDate() + delta);
  selectedDate = toDateInputValue(date);
  recordDate.value = selectedDate;
  renderAll();
}

async function openCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    camera.srcObject = cameraStream;
    camera.classList.add("active");
    cutoutPreview.classList.remove("has-image");
    emptyState.hidden = true;
    cameraAction.textContent = "拍照";
  } catch (error) {
    alert("无法打开相机，请检查权限，或改用上传照片。");
  }
}

async function captureFromCamera() {
  if (!camera.videoWidth) return;
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  await processSelectedImage(await compressDataUrl(dataUrl, 1300, 0.84));
}

function stopCamera(resetLabel = true) {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  camera.srcObject = null;
  camera.classList.remove("active");
  emptyState.hidden = false;
  cameraAction.disabled = false;
  if (resetLabel) cameraAction.textContent = "打开相机";
}

function toggleCalendarPanel() {
  calendarPanel.hidden = !calendarPanel.hidden;
  document.querySelector("#toggleCalendar").textContent = calendarPanel.hidden ? "日历" : "收起日历";
}
function updateBackground() {
  currentBackground = backgroundPicker.value;
  localStorage.setItem(backgroundKey, currentBackground);
  applyBackground();
  renderAll();
}

function applyBackground() {
  document.documentElement.dataset.boardBg = currentBackground;
}
function loadRecords() {
  return JSON.parse(localStorage.getItem(storeKey) || "[]");
}

function saveRecords(records) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(records));
  } catch (error) {
    const compact = records.slice(0, 40).map((record) => ({ ...record, cutout: record.cutout || "" }));
    localStorage.setItem(storeKey, JSON.stringify(compact));
  }
}

function migrateRecords() {
  if (localStorage.getItem(storeKey)) return;
  for (const key of legacyKeys) {
    const legacy = JSON.parse(localStorage.getItem(key) || "[]");
    if (!legacy.length) continue;
    const migrated = legacy.map((record, index) => {
      const title = record.title || record.food || "未命名食物";
      return {
        id: record.id || crypto.randomUUID(),
        date: record.date || today(),
        title,
        kcal: Number(record.kcal || String(record.badge || "").match(/\d+/)?.[0] || estimateCalories(title)),
        notes: record.notes || record.extra || record.place || record.shop || "",
        cutout: record.cutout || record.original || "",
        createdAt: record.createdAt || new Date().toISOString(),
        x: randomBetween(8, 68),
        y: randomBetween(10, 66),
        rotate: (index % 5 - 2) * 5,
      };
    });
    saveRecords(migrated);
    return;
  }
}

function recordsForDate(date) {
  return loadRecords()
    .filter((record) => record.date === date)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function totalKcal(records) {
  return records.reduce((sum, record) => sum + Number(record.kcal || 0), 0);
}

function estimateCalories(title) {
  const text = String(title || "");
  const rules = [
    [/香蕉/, 102], [/苹果|青苹果/, 78], [/面包|吐司|贝果|欧包/, 320], [/蛋糕|甜甜圈|奶油/, 430],
    [/奶茶|拿铁|咖啡|冰乐|饮品/, 280], [/饭|面|粉|炒饭|盖浇/, 620], [/火锅|炸|烤肉|汉堡|披萨/, 780],
    [/鸡|牛|羊|猪|鱼|虾|肉/, 520], [/沙拉|轻食|蔬菜/, 260], [/粥|汤|豆腐/, 220],
  ];
  const match = rules.find(([regex]) => regex.test(text));
  return match ? match[1] : 360 + Math.floor(Math.random() * 120);
}

async function makeCutout(src) {
  const image = await loadImage(src);
  const maxSize = 1000;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const guard = detectSubjectBounds(data, width, height);
  const mask = traceConnectedBackground(data, width, height);
  clearProtectedMask(mask, width, height, guard);
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) data[i * 4 + 3] = 0;
  featherBackgroundEdge(data, mask, width, height);
  ctx.putImageData(imageData, 0, 0);
  const webp = canvas.toDataURL("image/webp", 0.86);
  return { image: webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png") };
}

function detectSubjectBounds(data, width, height) {
  const samples = edgeSamples(data, width, height);
  let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
  const step = Math.max(3, Math.floor(Math.min(width, height) / 170));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const center = distanceFromCenter(x, y, width, height);
      const differs = samples.every((sample) => colorDistance(data, index, sample) > 35);
      if (differs && center < .58) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); count += 1;
      }
    }
  }
  if (count < 80) return { cx: width / 2, cy: height / 2, rx: width * .44, ry: height * .44 };
  const pad = Math.min(width, height) * .16;
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, rx: Math.max((maxX - minX) / 2 + pad, width * .38), ry: Math.max((maxY - minY) / 2 + pad, height * .36) };
}

function traceConnectedBackground(data, width, height) {
  const total = width * height;
  const mask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = [];
  const samples = edgeSamples(data, width, height);
  const threshold = estimateBackgroundThreshold(samples);
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const point = y * width + x;
    if (visited[point]) return;
    visited[point] = 1;
    const index = point * 4;
    if (isBackgroundPixel(data, index, samples, threshold)) { mask[point] = 1; queue.push(point); }
  };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor];
    const x = point % width;
    const y = Math.floor(point / width);
    enqueue(x + 1, y); enqueue(x - 1, y); enqueue(x, y + 1); enqueue(x, y - 1);
  }
  if (mask.reduce((sum, value) => sum + value, 0) / total > .78) return new Uint8Array(total);
  return mask;
}

function clearProtectedMask(mask, width, height, guard) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - guard.cx) / (guard.rx * .92);
      const dy = (y - guard.cy) / (guard.ry * .92);
      if (dx * dx + dy * dy <= 1) mask[y * width + x] = 0;
    }
  }
}

function featherBackgroundEdge(data, mask, width, height) {
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const point = y * width + x;
      if (mask[point]) continue;
      const near = mask[point - 1] + mask[point + 1] + mask[point - width] + mask[point + width];
      if (near) data[point * 4 + 3] = Math.max(100, Math.round(data[point * 4 + 3] * .88));
    }
  }
}

function edgeSamples(data, width, height) {
  return [[.04,.04],[.5,.04],[.96,.04],[.04,.5],[.96,.5],[.04,.96],[.5,.96],[.96,.96]].map(([px, py]) => {
    const x = Math.floor(width * px), y = Math.floor(height * py), index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  });
}

function estimateBackgroundThreshold(samples) {
  const center = samples.reduce((sum, sample) => [sum[0] + sample[0], sum[1] + sample[1], sum[2] + sample[2]], [0,0,0]).map((value) => value / samples.length);
  const avg = samples.reduce((sum, sample) => sum + Math.sqrt((sample[0] - center[0]) ** 2 + (sample[1] - center[1]) ** 2 + (sample[2] - center[2]) ** 2), 0) / samples.length;
  return Math.max(28, Math.min(56, 26 + avg * .3));
}

function isBackgroundPixel(data, index, samples, threshold) {
  return samples.some((sample) => colorDistance(data, index, sample) <= threshold);
}

function colorDistance(data, index, sample) {
  return Math.sqrt((data[index] - sample[0]) ** 2 + (data[index + 1] - sample[1]) ** 2 + (data[index + 2] - sample[2]) ** 2);
}

function distanceFromCenter(x, y, width, height) {
  return Math.sqrt(((x - width / 2) / width) ** 2 + ((y - height / 2) / height) ** 2);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressDataUrl(src, maxSize = 1200, quality = .82) {
  const image = await loadImage(src);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function exportTodayImage() {
  const records = recordsForDate(selectedDate);
  if (!records.length) {
    alert("今天还没有活动贴纸，先拍照记录一张再保存。");
    return;
  }
  const canvasOut = document.createElement("canvas");
  canvasOut.width = 1080;
  canvasOut.height = 1500;
  const ctx = canvasOut.getContext("2d");
  drawSceneBackground(ctx, canvasOut.width, canvasOut.height, dayBackground(records));
  drawOrbit(ctx, canvasOut.width, canvasOut.height);
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.font = "900 58px Microsoft YaHei, sans-serif";
  ctx.fillText(`${formatMonthDay(selectedDate)} 活动贴纸`, 70, 110);
  ctx.font = "700 30px Microsoft YaHei, sans-serif";
  ctx.fillText(`${records.length} 张贴纸 · ${totalKcal(records)} kcal`, 74, 158);
  await drawRecordStickers(ctx, records, canvasOut.width, canvasOut.height, 140, 1280, 1.45);
  downloadCanvas(canvasOut, `activity-${selectedDate}.png`);
}

async function exportMonthImage() {
  const monthRecords = loadRecords().filter((record) => record.date?.startsWith(displayMonth));
  if (!monthRecords.length) {
    alert("这个月还没有记录，无法保存月历图。");
    return;
  }
  const monthDate = new Date(`${displayMonth}-01T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const canvasOut = document.createElement("canvas");
  canvasOut.width = 1400;
  canvasOut.height = 1700;
  const ctx = canvasOut.getContext("2d");
  drawPaperBackground(ctx, canvasOut.width, canvasOut.height);
  ctx.fillStyle = "#3b2a24";
  ctx.font = "900 76px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${year}年${month + 1}月`, canvasOut.width / 2, 120);
  ctx.font = "700 30px Microsoft YaHei, sans-serif";
  ctx.fillStyle = "#8b8178";
  ctx.fillText(`${new Set(monthRecords.map((record) => record.date)).size} 天有记录 · ${monthRecords.length} 份活动`, canvasOut.width / 2, 168);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const left = 90, top = 250, gap = 18, cell = 160;
  ctx.textAlign = "center";
  ctx.font = "800 28px Microsoft YaHei, sans-serif";
  ctx.fillStyle = "#8b8178";
  weekdays.forEach((day, index) => ctx.fillText(day, left + index * (cell + gap) + cell / 2, top - 30));
  for (let day = 1; day <= totalDays; day += 1) {
    const index = startDay + day - 1;
    const x = left + (index % 7) * (cell + gap);
    const y = top + Math.floor(index / 7) * (cell + gap);
    const date = `${displayMonth}-${String(day).padStart(2, "0")}`;
    const records = recordsForDate(date);
    await drawCalendarCell(ctx, x, y, cell, day, records);
  }
  downloadCanvas(canvasOut, `activity-month-${displayMonth}.png`);
}

function drawPaperBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff8ed");
  gradient.addColorStop(.55, "#eef6ea");
  gradient.addColorStop(1, "#fff2e7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,.62)";
  roundRect(ctx, 48, 205, width - 96, 1180, 54);
  ctx.fill();
}

function drawSceneBackground(ctx, width, height, bg) {
  const palettes = {
    garden: ["#fff8ec", "#edf3df", "#ffc078"],
    cream: ["#fff3d8", "#f3dec2", "#fff8ea"],
    night: ["#151817", "#17313a", "#ffdd84"],
    mint: ["#e9fff0", "#d9f4ee", "#ffe6a7"],
  };
  const colors = palettes[bg] || palettes.garden;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(.58, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = bg === "night" ? "rgba(0,0,0,.36)" : "rgba(255,255,255,.18)";
  ctx.fillRect(0, 0, width, height);
}

function drawOrbit(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.66)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2 + 40, 220, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.82)";
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 / 8) * i;
    ctx.beginPath();
    ctx.ellipse(width / 2 + Math.cos(angle) * 220, height / 2 + 40 + Math.sin(angle) * 220, 18, 7, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

async function drawRecordStickers(ctx, records, width, height, minY, maxY, scale = 1) {
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const fallback = nextStickerPlacement(index);
    const x = (record.x ?? fallback.x) / 100 * width;
    const y = minY + (record.y ?? fallback.y) / 100 * (maxY - minY);
    const image = await loadImage(recordImage(record));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((record.rotate ?? fallback.rotate) * Math.PI) / 180);
    const size = 118 * scale;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    roundRect(ctx, -size / 2 - 10, -size / 2 - 8, size + 20, size + 20, 28);
    ctx.fill();
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.fillStyle = "rgba(255,255,255,.92)";
    roundRect(ctx, -58 * scale, size / 2 - 2, 116 * scale, 34 * scale, 18 * scale);
    ctx.fill();
    ctx.fillStyle = "#3b2a24";
    ctx.font = `${Math.round(18 * scale)}px Microsoft YaHei, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(record.title, 0, size / 2 + 22 * scale);
    ctx.restore();
  }
}

async function drawCalendarCell(ctx, x, y, size, day, records) {
  ctx.save();
  ctx.translate(x, y);
  roundRect(ctx, 0, 0, size, size, 28);
  ctx.clip();
  drawSceneBackground(ctx, size, size, dayBackground(records));
  ctx.fillStyle = "rgba(255,255,255,.76)";
  roundRect(ctx, 10, 10, 38, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#53473f";
  ctx.font = "800 22px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(day), 29, 34);
  for (let index = 0; index < records.slice(0, 4).length; index += 1) {
    await drawCalendarSticker(ctx, size, records[index], index);
  }
  ctx.restore();
}

async function drawCalendarSticker(ctx, size, record, index) {
  const image = await loadImage(recordImage(record));
  const fallback = nextStickerPlacement(index);
  const sx = ((record.x ?? fallback.x) / 100) * size;
  const sy = ((record.y ?? fallback.y) / 100) * size;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(((record.rotate ?? fallback.rotate) * Math.PI) / 180);
  ctx.fillStyle = "rgba(255,255,255,.86)";
  roundRect(ctx, -29, -27, 58, 58, 16);
  ctx.fill();
  ctx.drawImage(image, -24, -24, 48, 48);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function downloadCanvas(canvasOut, filename) {
  const link = document.createElement("a");
  link.href = canvasOut.toDataURL("image/png");
  link.download = filename;
  link.click();
}
function bind(selector, event, handler) { document.querySelector(selector).addEventListener(event, handler); }
function today() { return toDateInputValue(new Date()); }
function toDateInputValue(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function dateTitle(dateValue) { const d = new Date(`${dateValue}T00:00:00`); return `${d.getMonth() + 1}月${d.getDate()}日`; }
function formatMonthDay(dateValue) { const d = new Date(`${dateValue}T00:00:00`); return `${d.getMonth() + 1}月${d.getDate()}日`; }
function timeText(value) { const d = value ? new Date(value) : new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function weekDates(dateValue) { const d = new Date(`${dateValue}T00:00:00`); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return Array.from({ length: 7 }, (_, i) => { const next = new Date(d); next.setDate(d.getDate() + i); return next; }); }
function weekday(date) { return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]; }
function nextStickerPlacement(index) {
  const spots = [
    { x: 12, y: 10, rotate: -10 },
    { x: 58, y: 12, rotate: 8 },
    { x: 36, y: 34, rotate: -4 },
    { x: 68, y: 48, rotate: 10 },
    { x: 12, y: 56, rotate: -8 },
    { x: 42, y: 66, rotate: 6 },
    { x: 72, y: 18, rotate: -6 },
    { x: 22, y: 34, rotate: 7 },
  ];
  const base = spots[index % spots.length];
  const round = Math.floor(index / spots.length);
  return {
    x: clamp(base.x + round * 3, 4, 76),
    y: clamp(base.y + round * 4, 4, 76),
    rotate: base.rotate,
  };
}
function randomBetween(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttr(value) { return escapeHtml(value).replaceAll("`", "&#096;"); }





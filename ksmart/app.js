const elements = {
  searchForm: document.getElementById("search-form"),
  mobileNumber: document.getElementById("mobileNumber"),
  aadhaarNumber: document.getElementById("aadhaarNumber"),
  buildingId: document.getElementById("buildingId"),
  searchError: document.getElementById("search-error"),
  toggleSmart: document.getElementById("toggle-smart"),
  toggleAdvanced: document.getElementById("toggle-advanced"),
  searchSection: document.getElementById("search-section"),
  taxSection: document.getElementById("tax-section"),
  paymentSection: document.getElementById("payment-section"),
  resultSection: document.getElementById("result-section"),
  ownerName: document.getElementById("owner-name"),
  displayBuildingId: document.getElementById("display-building-id"),
  ward: document.getElementById("ward"),
  propertyAddress: document.getElementById("property-address"),
  taxAmount: document.getElementById("tax-amount"),
  penaltyAmount: document.getElementById("penalty-amount"),
  dueDate: document.getElementById("due-date"),
  totalPayable: document.getElementById("total-payable"),
  taxStatus: document.getElementById("tax-status"),
  paidBanner: document.getElementById("paid-banner"),
  payButton: document.getElementById("pay-button"),
  newSearch: document.getElementById("new-search"),
  paymentAmount: document.getElementById("payment-amount"),
  qrSimulate: document.getElementById("qr-simulate"),
  qrLabel: document.getElementById("qr-label"),
  vpa: document.getElementById("vpa"),
  paymentError: document.getElementById("payment-error"),
  confirmPay: document.getElementById("confirm-pay"),
  backToTax: document.getElementById("back-to-tax"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  resultBuilding: document.getElementById("result-building"),
  resultStatus: document.getElementById("result-status"),
  resultRef: document.getElementById("result-ref"),
  resultNewSearch: document.getElementById("result-new-search"),
  overlay: document.getElementById("overlay"),
  steps: document.querySelectorAll(".step")
};

const state = {
  buildings: [],
  selectedBuilding: null,
  selectedTax: null,
  isProcessing: false
};

const statusLabels = {
  PENDING: "Tax Pending",
  PAID: "Tax Paid"
};

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function showError(el, message) {
  el.textContent = message;
  el.classList.toggle("hidden", !message);
}

function setOverlayVisible(isVisible) {
  state.isProcessing = Boolean(isVisible);
  elements.overlay.classList.toggle("hidden", !state.isProcessing);
  elements.overlay.hidden = !state.isProcessing;
}

function setActiveStep(stepIndex) {
  elements.steps.forEach((step, i) => {
    step.classList.toggle("active", i === stepIndex);
  });
}

function showSection(section, stepIndex) {
  elements.searchSection.classList.add("hidden");
  elements.taxSection.classList.add("hidden");
  elements.paymentSection.classList.add("hidden");
  elements.resultSection.classList.add("hidden");
  section.classList.remove("hidden");
  setActiveStep(stepIndex);
  setOverlayVisible(false);
}

function getSelectedTax() {
  if (!state.selectedBuilding) return null;
  return state.selectedBuilding.taxes.find(
    (tax) => tax.id === state.selectedTax?.id
  ) || null;
}

function renderTaxSummary() {
  const building = state.selectedBuilding;
  const tax = getSelectedTax();
  if (!building || !tax) return;

  elements.ownerName.textContent = building.ownerName;
  elements.displayBuildingId.textContent = building.buildingId;
  elements.ward.textContent = building.ward;
  elements.propertyAddress.textContent = building.address;
  
  elements.taxAmount.textContent = formatMoney(tax.taxAmount);
  elements.penaltyAmount.textContent = formatMoney(tax.penalty);
  elements.dueDate.textContent = tax.dueDate;
  elements.totalPayable.textContent = formatMoney(tax.taxAmount + tax.penalty);

  elements.taxStatus.textContent = statusLabels[tax.status] || tax.status;
  elements.taxStatus.className = `status-badge ${tax.status.toLowerCase()}`;

  elements.paidBanner.classList.toggle("hidden", tax.status !== "PAID");
  elements.payButton.disabled = tax.status === "PAID";
}

function updatePaymentSection() {
  const tax = getSelectedTax();
  if (!tax) return;
  const total = tax.taxAmount + tax.penalty;
  elements.paymentAmount.textContent = `Pay ${formatMoney(total)}`;
  elements.qrLabel.textContent = `upi://pay?pa=ksmart@upi&pn=KSMART&am=${total}`;
  elements.vpa.value = "";
  showError(elements.paymentError, "");
}

function resetForm() {
  elements.mobileNumber.value = "";
  elements.aadhaarNumber.value = "";
  elements.buildingId.value = "";
  elements.vpa.value = "";
  showError(elements.searchError, "");
  showError(elements.paymentError, "");
  state.selectedBuilding = null;
  state.selectedTax = null;
  showSection(elements.searchSection, 0);
}

async function handleSearch(event) {
  event.preventDefault();
  showError(elements.searchError, "");

  const mobile = elements.mobileNumber.value.trim();
  const aadhaar = elements.aadhaarNumber.value.trim();
  const buildingId = elements.buildingId.value.trim();

  if (!mobile && !aadhaar && !buildingId) {
    showError(elements.searchError, "Enter at least one search field.");
    return;
  }

  const building = state.buildings.find((item) => {
    if (mobile && item.mobileNumber === mobile) return true;
    if (aadhaar && item.aadhaarNumber === aadhaar) return true;
    if (buildingId && item.buildingId === buildingId) return true;
    return false;
  });

  if (!building) {
    showError(elements.searchError, "No building record found.");
    return;
  }

  if (!building.taxes || building.taxes.length === 0) {
    showError(elements.searchError, "No tax records for this building.");
    return;
  }

  state.selectedBuilding = building;
  const pendingTax = building.taxes.find((t) => t.status === "PENDING");
  state.selectedTax = pendingTax || building.taxes[0];

  renderTaxSummary();
  showSection(elements.taxSection, 1);
}

async function handlePay() {
  if (state.isProcessing) return;
  showError(elements.paymentError, "");

  const vpa = elements.vpa.value.trim();
  const tax = getSelectedTax();

  if (!vpa) {
    showError(elements.paymentError, "Enter a UPI ID to proceed.");
    return;
  }

  if (!tax || !state.selectedBuilding) {
    showError(elements.paymentError, "No tax record selected.");
    return;
  }

  setOverlayVisible(true);
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const isFailure = vpa.toLowerCase().includes("fail");
  const isSuccess = vpa.toLowerCase().includes("success") || !isFailure;
  const data = isSuccess
    ? { status: "SUCCESS", message: "Payment captured. Your building tax is marked as paid." }
    : { status: "FAILURE", message: "UPI authorization failed. Please try again." };

  setOverlayVisible(false);

  if (data.status === "SUCCESS") {
    state.selectedBuilding.taxes = state.selectedBuilding.taxes.map((item) =>
      item.id === tax.id ? { ...item, status: "PAID" } : item
    );
    state.selectedTax = getSelectedTax();
  }

  renderTaxSummary();
  elements.resultTitle.textContent =
    data.status === "SUCCESS" ? "Payment Successful" : "Payment Failed";
  elements.resultMessage.textContent = data.message || "";
  elements.resultBuilding.textContent = state.selectedBuilding.buildingId;
  const updatedTax = getSelectedTax();
  elements.resultStatus.textContent =
    statusLabels[updatedTax?.status] || updatedTax?.status || "";
  elements.resultRef.textContent = `TXN-${Date.now().toString().slice(-6)}`;

  showSection(elements.resultSection, 3);
}

function handleQrSimulate() {
  elements.vpa.value = "success@upi";
  handlePay();
}

async function loadBuildings() {
  const response = await fetch("./data/consumers.json");
  state.buildings = await response.json();
}

function setupEvents() {
  elements.searchForm.addEventListener("submit", handleSearch);
  elements.newSearch.addEventListener("click", resetForm);
  elements.resultNewSearch.addEventListener("click", resetForm);

  elements.payButton.addEventListener("click", () => {
    updatePaymentSection();
    showSection(elements.paymentSection, 2);
  });

  elements.backToTax.addEventListener("click", () => {
    showSection(elements.taxSection, 1);
  });

  elements.confirmPay.addEventListener("click", handlePay);

  elements.qrSimulate.addEventListener("click", handleQrSimulate);
  elements.qrSimulate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleQrSimulate();
    }
  });

  elements.toggleSmart.addEventListener("click", () => {
    elements.toggleSmart.classList.add("active");
    elements.toggleAdvanced.classList.remove("active");
  });

  elements.toggleAdvanced.addEventListener("click", () => {
    elements.toggleAdvanced.classList.add("active");
    elements.toggleSmart.classList.remove("active");
  });
}

loadBuildings().then(() => {
  setupEvents();
  showSection(elements.searchSection, 0);
});

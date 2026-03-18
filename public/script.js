//backend origin link
const server =  'http://localhost:3000'

//SECTION COMPONENTS
const homePage = document.getElementById('home-page');
const registerPage = document.getElementById('register-page')
const verifyEmailPage = document.getElementById('verify-email-page');
const loginPage = document.getElementById('login-page');
const profilePage = document.getElementById('profile-page');
const employeesPage = document.getElementById('employees-page');
const departmentsPage = document.getElementById('departments-page')
const accountsPage = document.getElementById('accounts-page');
const requestsPage = document.getElementById('requests-page');
const body = document.querySelector('body');

let currentPage = homePage;
//MODAL ELEMENTS
const accountModal = document.getElementById('accounts-modal');
const myAccModal = new bootstrap.Modal(accountModal);

const employeeModal = document.getElementById('employees-modal');
const myEmployeeModal = new bootstrap.Modal(employeeModal);

const requestModal = document.getElementById('request-modal');
const myRequestModal = new bootstrap.Modal(requestModal);

const modalArr = document.querySelectorAll('.modal');

modalArr.forEach(modal => modal.addEventListener('show.bs.modal', () => {
    modal.querySelector('.modal-title').textContent = editing ? 'Edit' : 'Add'
}))

modalArr.forEach(modal => modal.addEventListener('hidden.bs.modal', () => {
   editing = false
}))


modalArr.forEach(modal => modal.addEventListener('hide.bs.modal', () => {
    modal.querySelector('.modal-title').textContent = 'Add'
}))



//FORM ELEMENTS
const accountsForm = document.getElementById('accounts-form');
const employeesForm = document.getElementById('employees-form');
const registrationForm = document.getElementById('registration-form');
const loginForm = document.getElementById('login-form')

//OPEN MODAL BUTTON ELEMENTS
const accountsModalBtn = document.getElementById('accounts-modal-btn');
const requestsModalBtn = document.getElementById('requests-modal-btn');
const employeesModalBtn = document.getElementById('employees-modal-btn');


//EVENT LISTENERS FOR MODAL OPENING BUTTONS
accountsModalBtn.addEventListener("click", () => {
    document.getElementById('account-label-pass').classList.remove('hide-msg')
    resetInputs(accountsForm);
})

employeesModalBtn.addEventListener("click", () => {
    resetInputs(employeesForm)
})

//MODAL SAVE MODAL BTNS
const saveAccountBtn = document.getElementById('save-account');
const saveEmployeeBtn = document.getElementById('save-employee');
const saveRequestBtn = document.getElementById('save-request');


//OTHER ELEMENTS
const verificationBtn = document.getElementById('verification-btn');
const getStartedBtn = document.getElementById('get-started-btn');
const cancelRegisterBtn = document.getElementById('cancel-register-btn');
const cancelLoginBtn = document.getElementById('login-cancel-btn');


//DYNAMIC STYLING
const buttons = document.querySelectorAll('button');
buttons.forEach(button => {
    button.classList.add('btn')
})

const labels = document.querySelectorAll('label');
labels.forEach(label => {
    label.classList.add('form-label')
})

//EVENT LISTENERS
verificationBtn.addEventListener('click', handleVerification)
getStartedBtn.addEventListener('click', () => {
    navigateTo('#/register');
})

const modals = document.querySelectorAll('.modal');
modals.forEach(dialog => {
    dialog.addEventListener('hidde.bs.modal', () => {
        editing = false
    })
})

cancelRegisterBtn.addEventListener('click', () => {
navigateTo('#/')
})

cancelLoginBtn.addEventListener('click', () => {
    navigateTo('#/')
})
saveAccountBtn.addEventListener("click", saveAccount)
saveEmployeeBtn.addEventListener("click", saveEmployee)
saveRequestBtn.addEventListener("click", saveItems)

requestsModalBtn.addEventListener("click", openRequestModal);

employeesModalBtn.addEventListener("click", () => {
    resetInputs(employeesForm)
})

//==========================TOGGLE PASSWORDS=====================

// Register page password toggle
const registerPassword = document.getElementById("register-password");
const toggleRegister = document.getElementById("toggleRegisterPassword");

toggleRegister.addEventListener("click", () => {
    registerPassword.type = registerPassword.type === "password" ? "text" : "password";
});

// Login page password toggle
const loginPassword = document.getElementById("login-password");
const toggleLogin = document.getElementById("toggleLoginPassword");

toggleLogin.addEventListener("click", () => {
    loginPassword.type = loginPassword.type === "password" ? "text" : "password";
});


// Accounts modal password toggle
const accountPassword = document.getElementById("account-password");
const toggleAccount = document.getElementById("toggleAccountPassword");

toggleAccount.addEventListener("click", () => {
    accountPassword.type = accountPassword.type === "password" ? "text" : "password";
});



let currentUser = null;
window.location.hash = '#/'

let editing = false;
let editingEmail;
let itemRequests = [];
let unverifiedEmail;


const qtyInputs = document.querySelectorAll('.itemQty')

qtyInputs.forEach(input => {
    input.addEventListener('input', () => {
        if (parseInt(input.value) <= 0){
            input.value = 1
        }
    })
});

document.getElementById('registration-form')
    .addEventListener('submit', function(e){
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        handleRegistration(data);
});

document.getElementById('login-form').addEventListener('submit', function(e){
    e.preventDefault()
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    handleLogin(data);
})

function getAuthHeader(){
    const token = sessionStorage.getItem('authToken');
    return token ? {'authorization' : `Bearer ${token}`} : {}
}

function navigateTo(hash){
    window.location.hash = hash
}

const toastEl = document.getElementById('toast-el');
const toastMsg = document.getElementById('toast-msg');
const myToast = new bootstrap.Toast(toastEl);

function showToast(message, boolValue){
    toastMsg.innerText = message
    
    if(boolValue){
        toastEl.classList.remove('bg-danger')
        toastEl.classList.add('bg-success')
    }else{
        toastEl.classList.remove('bg-success')
        toastEl.classList.add('bg-danger')
    }
    myToast.show()
}

function handleRouting(){
    const hash = window.location.hash;
    currentPage.classList.remove('active');

    switch (hash){
        case '#/': currentPage = homePage;break;
        case '#/login': 
            resetInputs(loginForm)
            currentPage = loginPage; break;
        case '#/register' :
            resetInputs(registrationForm) 
            currentPage = registerPage; break;
        case '#/verify-email' : currentPage = verifyEmailPage; 
                                document.getElementById('unverified-email').innerText = unverifiedEmail
                                break;
        case '#/profile' : 
                        currentPage = profilePage; 
                        renderProfile();
                        break;
        case '#/requests' : 
                        renderRequests();
                        currentPage = requestsPage; break;
        case '#/employees' : 
                        renderDeptDropdown();
                        renderEmployees();
                        break;
        case '#/accounts' : 
                        if(currentUser.role != 'admin')
                            return;
                        currentPage = accountsPage; 
                        renderAccounts();
                        break;
        case '#/departments' :
                        renderDepartments();
                        break;
    }

    currentPage.classList.add('active')
}

function checkEmpty(inputs){
    let filled = true;
    for(let input of inputs){
        const value = input.type == 'password' ? input.value : input.value.trim();
        if(input.type != 'checkbox' && value == ''){
            input.style.borderColor = 'red'
            input.nextElementSibling.style.color = 'red'
            input.nextElementSibling.textContent = 'This field is required'
            filled = false
        }else{
            input.style.borderColor = 'gray'
            input.nextElementSibling.textContent = ''
        }
    }

    return filled;
}



async function setAuthState(isAuth, user){
    currentUser = user.user;
    if(isAuth){
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`${server}/api/profile`,
            {
                method: 'GET',
                headers: {
                    'Content-Type' : 'application/json',
                    'authorization' : `Bearer ${token}`
                }
            }
        )

        const data = await response.json()

        if(response.ok){
            user = response.user
            navigateTo('#/profile');
        }

        document.getElementById('role').textContent = data. user.firstName;

        if(data.user.role == 'admin'){
            body.classList.add('is-admin');
            
        }else{
            body.classList.remove('is-admin');
        }  
    }else{
        body.classList.remove('authenticated');
        body.classList.add('not-authenticated');
        return;
    }
    
}

// =================== LOGIN, LOGOUT, REGITRATION =================
async function handleRegistration(data){

    let status = true;
    const password = data.password;
    const email = data.email;
    
    //error messages elements for password and email in registration
    const passwordErrMsg = document.getElementById('pass-error-msg');
    const emailErrMsg = document.getElementById('email-error-msg')

    //check if there are empty fields
    const check = checkEmpty(registrationForm.querySelectorAll('input'))
    data.email = data.email.trim().toLowerCase();

    //check validity and uniqueness of email
    const emailRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const match = emailRegEx.test(email);
    
    emailErrMsg.innerText = match ? ' ' : 'Invalid email!'

    if(!match){
        return;
    }
    
    //check password length
    if(password.length < 6){
        //show error message the password must be 6 characters long
        passwordErrMsg.innerText = 'Password must be atleast six(6) characters in length';
        status = false;
        return;
    }else{
        passwordErrMsg.classList.add('hide-msg');
    }

    if(!status){
        return;
    }

    const response = await fetch(`${server}/api/register`, 
        {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify(data)
        }
    ).then(res => res.json())

    console.log(response);
    unverifiedEmail = response.email;
    navigateTo('#/verify-email');
}

async function handleVerification(){
    const response = await fetch(`${server}/api/verifyemail`,
        {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify({unverifiedEmail})
        }
    ).then(res => res.json());

    navigateTo('#/login')
}

async function handleLogin(data){

    const inputs = loginForm.querySelectorAll('input');
    const check = checkEmpty(inputs)
    if(!check){
        return;
    }

    data.email = data.email.trim().toLowerCase();

    try{
        const res = await fetch(`${server}/api/login`, 
            {
                method: 'POST',
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({email: data.email, password: data.password})
            }
        )

        const user = await res.json();

        if(res.ok){
            sessionStorage.setItem('authToken', user.token);
            setAuthState(true, user)
            showToast('Logged in successfully!', true)
        }else{
            showToast('Invalid credentials!',false)
        }

        document.getElementById('email-verified-msg').classList.add('hide-msg')
    }catch(err){
        console.err(err)
    }

    
}

function handleLogout(){
    localStorage.removeItem("auth_token")
    setAuthState(false)
    navigateTo('#/');
}

async function renderProfile(){

    const response = await fetch(`${server}/api/profile`, {
        method: 'GET',
        headers: getAuthHeader()
    })

    const data = await response.json();
    console.log(data)

    if(response.ok){
        document.getElementById('first-name').innerText = data.user.firstName;
        document.getElementById('last-name').innerText = data.user.lastName
        document.getElementById('profile-email').innerText = data.user.email;
        document.getElementById('profile-role').innerText = data.user.role;
    }
    
}


function editProfile(){
    alert('Not implemented.')
}



function resetInputs(form){
    const inputs = form.querySelectorAll('input')
    for (let input of inputs){

        if(input.type == 'checkbox'){
            input.checked = false;
        }

        input.value = '';
        input.nextElementSibling.textContent = ''
        input.style.borderColor = 'gray'
    }
}



function hideMsg(){
    document.getElementById('requests-msg-div').classList.add('hide-msg')
}

window.addEventListener("hashchange", handleRouting);

// ===================== ACCOUNTS-JS =======================

function saveAccount(){
    if(!editing)
        document.getElementById('account-label-pass').classList.remove('hide-msg')
    const verifiedField = document.getElementById('verified-field');
    const inputs = accountsForm.querySelectorAll('input');
    const check = checkEmpty(inputs);
    const element = document.getElementById('acc-email');
    let status = true;

    if(!check){
        return;
    }
    
    const formData = new FormData(accountsForm)
    const data = Object.fromEntries(formData);
    data.email = data.email.trim().toLowerCase();

    //validate email format
    const validEmail = emailValidation(data.email.trim());
    element.innerText = validEmail ? '' : 'Invalid email!'
    status = validEmail

    //check if email exists already!
    const account = window.db.accounts.some(acc => acc.email == data.email.trim())

    if(account && !editing){
        const element = document.getElementById('acc-email')
        element.textContent =  'Email already exists!';
        element.previousElementSibling.style.borderColor = 'red';
        return;
    }

     //password validation
    if(!passwordValidation(data.password.trim())){
        document.getElementById('account-pass-msg').textContent = 'Password must be 6 characters in length!'
        return;
    }

    if(verifiedField.checked){
        data.verified = true
    }else{
        data.verified = false;
    }
    
    document.getElementById('form-message-div').classList.add('hide-msg');

    if(editing && status){
        //finds the index of the account being edited and updates the values;
        const emailExists = window.db.accounts.some(account => account.email == editingEmail)

        if(emailExists && data.email.trim() != editingEmail){
            element.textContent =  'Email already exists!'; 
            return;
        }else{
            element.innerText =  '';
        }
        const index = window.db.accounts.findIndex(account => account.email == editingEmail);
        window.db.accounts[index].firstName = data.firstName.trim();
        window.db.accounts[index].lastName = data.lastName.trim();
        window.db.accounts[index].email = data.email.trim();
        window.db.accounts[index].password = data.password;
        window.db.accounts[index].role = data.role;
        window.db.accounts[index].verified = data.verified;
    }else if(!editing && status){
        const acc = window.db.accounts[window.db.accounts.length - 1];
        data.userId = acc.userId + 1;
        window.db.accounts.push(data);
       
    }

    if(status){
        saveToStorage();
        document.getElementById('accounts-cancel-btn').click();
        renderAccounts();
        if(editing){
            showToast("Successfully saved changes!", true);
        }else{
            showToast("Successfully added new account!", true);
        }
    }


    editing = false; 
}

function passwordValidation(password){
    const length = 6;
    if(password.length < length){
        return false;
    }else{
        return true;
    }
}

function emailValidation(email){
    const emailRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegEx.test(email);
}

function editAccount(email){
    document.getElementById('account-label-pass').classList.add('hide-msg')
    editing = true;
    editingEmail = email;

    const user = window.db.accounts.find(account => account.email == email);
    accountsForm.elements['firstName'].value = user.firstName;
    accountsForm.elements['lastName'].value = user.lastName;
    accountsForm.elements['email'].value = user.email;
    accountsForm.elements['password'].value = user.password;
    accountsForm.elements['role'].value = user.role;
    accountsForm.elements['verified-field'].checked = user.verified;
    // document.getElementById('accounts-modal-btn').click();
    myAccModal.show();
}

function resetPassword(email){
    const newPassword = prompt("Enter this account's new password. Password length must be minimum of six characters")
    const valid = passwordValidation(newPassword)
    if(!valid){
        alert('Invalid password. Password must be 6 characters long.');
        return;
    }else{
        const index = window.db.accounts.findIndex(account => account.email == email)
        window.db.accounts[index].password = newPassword;
        saveToStorage();
    }
}

function deleteAccount(email){
    if (email === currentUser.email){
        alert('You cannot delete your own account!')
        return;
    }else{
        
        if(confirm(`Are you sure you want to delete this acccount? Deleting so will also delete the employee associated with this account.`)){
            const accounts = window.db.accounts.filter(account => account.email != email);
            const employees = window.db.employees.filter(emp => emp.email != email)
            window.db.accounts = accounts;
            window.db.employees = employees
            saveToStorage();
            renderAccounts();
        }
    }
}

async function renderAccounts(){
    const tbody = document.getElementById('accounts-tbody');
    tbody.innerHTML = ''

    const response = await fetch(`${server}/api/admin/accounts`,
        {
            method: 'POST',
            headers: getAuthHeader()
        }
    )

    const data = await response.json()

    if(response.ok){
        for (let account of data.accounts){
            const element = `
                <tr>
                    <td>${account.firstName} ${account.lastName}</td>
                    <td>${account.email}</td>
                    <td>${account.role == 'admin' ? 'Admin' : 'User'}</td>
                    <td>${account.verified ? '✅' : ' ❌'}</td>
                    <td>
                        <button class="btn btn-outline-primary" onclick="editAccount('${account.email}')">Edit</button>
                        <button class="btn btn-outline-warning" onclick="resetPassword('${account.email}')">Reset Password</button>
                        <button class="btn btn-outline-danger" onclick="deleteAccount('${account.email}')">Delete</button>
                    </td>
                </tr>
            `

            tbody.innerHTML += element;
        }

        currentPage = accountsPage;
    }else{
        console.log('ERROR. Unauthorized access!')
    }
    
}

// ==================== EMPLOYEES-JS =======================

function saveEmployee(){
    const check = checkEmpty(employeesForm);

    if(!check){
        return;
    }

    const formData = new FormData(employeesForm);
    const data = Object.fromEntries(formData);
    const element = document.getElementById('employee-email')


    const employeeExists = window.db.employees.findIndex(employee => employee.email == data.email)
    if(employeeExists != -1 && !editing ){
        element.textContent = 'This email is already associated with an existing employee!';
        return;
    }

    const index = window.db.accounts.findIndex(account => account.email == data.email.trim());

    if(index == -1){
        element.textContent = 'This email does not have an account!';
        return;
    }
    
    element.textContent = ''
    const account = window.db.accounts.find(acc => acc.email == data.email )
    data.userId = account.userId;  
    data.deptId = parseInt(data.deptId) 
    
    
    

    if(!editing){
        window.db.employees.push(data);
    }else{
        // const empIndex = window.db.employees.findIndex(emp => emp.userId == account.userId)
        window.db.employees[employeeExists].deptId = data.deptId = parseInt(data.deptId)
        window.db.employees[employeeExists].id = data.id
        window.db.employees[employeeExists].hireDate = data.hireDate;
        window.db.employees[employeeExists].email = data.email;
        window.db.employees[employeeExists].position = data.position
    }

    saveToStorage();
    document.getElementById('employee-cancel-btn').click();
    renderEmployees(employeesForm);

    if(editing){
            showToast("Successfully saved changes!", true);
        }else{
            showToast("Successfully added new employee!", true);
        }
    editing = false;
}

function editEmployee(id){
    editing = true;

    const employee = window.db.employees.find(emp => emp.userId == id);
    const department = window.db.departments.find(dept => dept.deptId == employee.deptId)
    employeesForm.elements['id'].value = employee.id;
    employeesForm.elements['email'].value = employee.email;
    employeesForm.elements['position'].value = employee.position;
    employeesForm.elements['deptId'].value = employee.deptId;
    employeesForm.elements['hireDate'].value = employee.hireDate;
    myEmployeeModal.show();
    
}

function deleteEmployee(id){
    if(confirm('Are you sure you want to delete this employee?')){
        const index = window.db.employees.findIndex(employee => employee.userId == id)
        window.db.employees.splice(index, 1)
    }

    renderEmployees();
}

async function renderEmployees(){
    const tbody = document.getElementById('employees-tbody');
    tbody.innerHTML =''

    const response = await fetch(`${server}/api/admin/employees`, 
        {
            method: 'GET',
            headers: getAuthHeader()
        }
    )

    const data = await response.json()

    if(response.ok){
        if(data.employees.length == 0){
            const element = `
                <tr>
                <td colspan='5' class='text-center'>No employees found</td>  
                </tr>
            `;

            tbody.innerHTML = element;
            return;
            
        }
        for(let employee of data.employees){
            const user = window.db.accounts.find(acc => acc.userId == employee.userId);
            const department = window.db.departments.find(dept => dept.deptId == employee.deptId)
            const element = `
                <tr>
                    <td>${employee.id}</td>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${employee.position}</td?>
                    <td>${department.name}</td>
                    <td>
                        <button class="btn btn-outline-primary" onclick="editEmployee(${employee.userId})">Edit</button>
                        <button class="btn btn-outline-warning" onclick="deleteEmployee(${employee.userId})">Delete</button>
                    </td>
                </tr>
            `

            tbody.innerHTML += element
        }
        currentPage = employeesPage
    }
    
}

function renderDeptDropdown(){
     employeesForm.elements['deptId'].innerHTML = ''
    for(let department of window.db.departments){
        const element = `
            <option value=${department.deptId}>${department.name}</option>
        `

        employeesForm.elements['deptId'].innerHTML += element;
    }
}

// ==================== REQUESTS-JS =========================

function renderRequests(){
    const myRequests = window.db.requests.filter(req => req.employeeEmail == currentUser.email)

    const tbody = document.getElementById('requests-tbody');
    tbody.innerHTML = ''

    // if(myRequests.length == 0){
    //     const element = `
    //         <tr>
    //           <td colspan='5' class='text-center'>No requests found</td>  
    //         </tr>
    //     `;

    //     tbody.innerHTML = element;
    //     return;
    // }

    if(myRequests.length > 0){
        document.getElementById('no-requests-div').classList.add('hide-msg')
        document.getElementById('requests-table').classList.remove('hide-msg')
        for (let request of myRequests){
            const element = `
                <tr>
                    <td>${request.requestId}</td>
                    <td>${request.type}</td>
                    <td>${request.date}</td>
                    <td><span class="badge ${request.status == 'Pending' ? "bg-warning" : 
                        request.status == 'Approved' ? 'bg-success' : 'bg-danger'
                    }">${request.status} </span></td>

                </tr>
            `

            tbody.innerHTML += element
        }   
    }else{
        document.getElementById('no-requests-div').classList.remove('hide-msg')
        document.getElementById('requests-table').classList.add('hide-msg')
    }
    
}


function openRequestModal(){
    itemRequests = [
        {
            name: '',
            qty: 1,
        }
    ]
}

function addNewItem(){
    const itemRequestsDiv = document.getElementById('item-requests-div');
    const id = itemRequests.length;
    const div = document.createElement('div')
    div.innerHTML = `
        <div class="item-div" id="${id + 1}">
            <input type="text" class="itemName" placeholder="Item Name">
            <input type="number" min="1" class="itemQty" placeholder="Qty">
            <button type="button" class="btn btn-danger" onclick="deleteItem(${id + 1})">x</button>
        </div>
    `

    itemRequestsDiv.appendChild(div);
    itemRequests.push({})
    
}

function renderItems(){
    const itemRequestsDiv = document.getElementById('item-requests-div');
    itemRequestsDiv.innerHTML = '';
    for (let i = 0; i < itemRequests.length; i++){
        let element;
        if(i == 0){
            element = `
                <div class="item-div">
                    <input type="text" class="itemName" placeholder="Item Name">
                    <input type="number" min="1" class="itemQty" placeholder="Qty">
                    <button type="button" class="btn btn-success" onclick="addNewItem()">+</button>
                </div>
            `
        }else{
            element = `
                <div class="item-div">
                    <input type="text" class="itemName" placeholder="Item Name">
                    <input type="number" min="1" class="itemQty" placeholder="Qty">
                    <button type="button" class="btn btn-danger" onclick="deleteItem(${i + 1})">x</button>
                </div>
            `
        }

         itemRequestsDiv.innerHTML += element
    }
}

function deleteItem(id){
    //remove item element at place of id. if id is 2, remove element at index 2-1 = 1
    itemRequests.splice(id-1, 1)
    document.getElementById(`${id}`).remove();
}

function saveItems(){
    //check if items have empty values
    const itemDivs = document.querySelectorAll('.item-div');
    const msgDdiv = document.getElementById('requests-msg-div'); //error messages will be displayed here

    for(let i = 0; i < itemDivs.length; i++){
        const item = itemDivs[i].querySelector('.itemName').value;
        const qty = itemDivs[i].querySelector('.itemQty').value;

        if(item == '' || qty == ''){
           msgDdiv.classList.remove('hide-msg')
           msgDdiv.innerText = 'Please fill out all fields!'
            return;
        }

        itemRequests[i] = {
            name: item,
            qty: qty
        }
    }

    msgDdiv.classList.add('hide-msg')
    

    window.db.requests.push(
        {
            requestId: window.db.requests.length + 1,
            type: document.getElementById('equipment-type').value,
            items: itemRequests,
            status: 'Pending',
            date: new Date().toISOString().split('T')[0],
            employeeEmail: currentUser.email

        }
    )

    saveToStorage();
    document.getElementById('request-close-btn').click();
    renderRequests();
    const inputs = requestsPage.querySelectorAll('input')
    resetInputs(requestsPage);
    itemRequests = []
}

// ================ DEPARTMENTS-JS ===========================

function addDepartment(){
    alert('Not implemented.')
}

async function renderDepartments(){
    const response = await fetch(`${server}/api/admin/departments`,
        {
            method: 'GET',
            headers: getAuthHeader()
        }
    )

    const data = await response.json();
    console.log(response.ok)
    if(response.ok){
        const departments = data.departments;
        const tbody = document.getElementById('dept-tbody');
        tbody.innerHTML = ''
        for (let i = 0; i < departments.length; i++){
            
            const element = `
                <tr>
                    <td>${departments[i].name}</td>
                    <td>${departments[i].description}</td>
                    <td>
                        <button class="btn btn-outline-primary">Edit</button>
                        <button class="btn btn-outline-danger">Delete</button>
                    </td>
                </tr>
            `

            tbody.innerHTML += element;
        }

        currentPage = departmentsPage;
    }else{
        console.log('ERROR')
    }
    
}
function openAddMemberModal() {
    const modalError = document.getElementById('modalError');
    if (modalError) modalError.style.display = 'none';
    
    document.getElementById('addMemberForm').reset();
    document.getElementById('addMemberModal').style.display = 'flex';
}

function closeAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'none';
}

const addMemberFormEl = document.getElementById('addMemberForm');
if (addMemberFormEl) addMemberFormEl.addEventListener('submit', function(e) {
    const err = document.getElementById('modalError');
    
    const fullName = this.querySelector('input[name="full_name"]').value;
    const relationship = this.querySelector('input[name="relationship"]').value;
    const dob = this.querySelector('input[name="dob"]').value;

    if (!fullName || !relationship || !dob) {
        e.preventDefault();
        if (err) {
            err.textContent = 'Please fill in all required fields marked with *';
            err.style.display = 'block';
        }
        return false;
    }
});
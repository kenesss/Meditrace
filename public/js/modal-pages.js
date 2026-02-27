function openAddMemberModal(){
                document.getElementById('modalError').style.display = 'none';
                document.getElementById('addMemberForm').reset();
                document.getElementById('addMemberModal').style.display = 'flex';
            }
            function closeAddMemberModal(){
                document.getElementById('addMemberModal').style.display = 'none';
            }
            document.getElementById('addMemberForm').addEventListener('submit', function(e){
                var p = document.getElementById('password').value;
                var cp = document.getElementById('confirmPassword').value;
                var err = document.getElementById('modalError');
                if(p !== cp){
                    e.preventDefault();
                    err.textContent = 'Passwords do not match.';
                    err.style.display = 'block';
                    return false;
                }
            });
const fs = require('fs');
const file = 'src/app/(protected)/incidents/IncidentsContent.tsx';
let data = fs.readFileSync(file, 'utf-8');
data = data.replace('const [userRole, setUserRole] = useState<string>(\'\')', "const [userRole, setUserRole] = useState<string>('');\n    const [userSupportLevel, setUserSupportLevel] = useState<string>('');");
data = data.replace('if (data) setUserRole(data.role)', 'if (data) { setUserRole(data.role); setUserSupportLevel(data.support_level); }');
data = data.replace('userRole={userRole}', 'userRole={userRole} userSupportLevel={userSupportLevel}');
fs.writeFileSync(file, data);

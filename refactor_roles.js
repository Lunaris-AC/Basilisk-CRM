const fs = require('fs');

const files = [
  'src/app/(protected)/admin/debug/AdminDebugContent.tsx',
  'src/app/(protected)/admin/debug/page.tsx',
  'src/app/(protected)/clients/page.tsx',
  'src/app/(protected)/commerce/[id]/page.tsx',
  'src/app/(protected)/parametres/profil/page.tsx',
  'src/app/(protected)/tickets/[id]/TicketDetailContent.tsx',
  'src/app/(protected)/wallboard/page.tsx',
  'src/app/(protected)/wiki/page.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/features/admin/components/RoutingRuleForm.tsx',
  'src/features/tickets/actions.ts',
  'src/features/tickets/components/TicketTable.tsx',
  'src/features/wiki/actions.ts',
  'src/features/admin/actions.ts'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf-8');

  code = code.replace(/callerProfile\?\.role !== 'N4'/g, `(callerProfile?.role !== 'TECHNICIEN' || callerProfile?.support_level !== 'N4')`);
  code = code.replace(/profile\?\.role === 'N4'/g, `(profile?.role === 'TECHNICIEN' && profile?.support_level === 'N4')`);
  code = code.replace(/profile\?\.role !== 'N4'/g, `(profile?.role !== 'TECHNICIEN' || profile?.support_level !== 'N4')`);
  code = code.replace(/profile\?\.role === 'N3'/g, `(profile?.role === 'TECHNICIEN' && profile?.support_level === 'N3')`);
  code = code.replace(/profile\?\.role === 'N2'/g, `(profile?.role === 'TECHNICIEN' && profile?.support_level === 'N2')`);
  code = code.replace(/profile\?\.role === 'N1'/g, `(profile?.role === 'TECHNICIEN' && profile?.support_level === 'N1')`);

  code = code.replace(/\['N1', 'N2', 'N3', 'N4', 'ADMIN'\]\.includes\(myProfile\.role\)/g, `(['ADMIN'].includes(myProfile.role) || (myProfile.role === 'TECHNICIEN' && ['N1', 'N2', 'N3', 'N4'].includes(myProfile.support_level)))`);
  code = code.replace(/\['N1', 'N2', 'N3', 'N4', 'ADMIN'\]\.includes\(myProfile\?\.role\)/g, `(['ADMIN'].includes(myProfile?.role) || (myProfile?.role === 'TECHNICIEN' && ['N1', 'N2', 'N3', 'N4'].includes(myProfile?.support_level)))`);

  code = code.replace(/\['N3', 'N4', 'ADMIN'\]\.includes\(profile\?\.role \?\? ''\)/g, `(['ADMIN'].includes(profile?.role ?? '') || (profile?.role === 'TECHNICIEN' && ['N3', 'N4'].includes(profile?.support_level ?? '')))`);

  code = code.replace(/!\['N1', 'N2', 'N3'\]\.includes\(userRole \|\| ''\)/g, `!(userRole === 'TECHNICIEN' && ['N1', 'N2', 'N3'].includes(userSupportLevel || ''))`);

  fs.writeFileSync(file, code);
});
console.log('Role Checks replaced successfully.');

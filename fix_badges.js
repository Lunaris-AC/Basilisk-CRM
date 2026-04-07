const fs = require('fs');

function repl(file) {
    let data = fs.readFileSync(file, 'utf8');
    
    // In Sidebar.tsx and profil/page.tsx, it currently says:
    // {(profile?.role === 'TECHNICIEN' && profile?.support_level === 'N4') ? 'ADMIN N4' : `NIVEAU ${profile?.role}`}
    // We want to replace it with:
    // {profile?.role === 'TECHNICIEN' ? `TECH ${profile?.support_level}` : `NIVEAU ${profile?.role}`}
    // Wait, let's keep 'ADMIN N4' if support_level === N4? 
    // The prompt says "Si le rôle est 'TECHNICIEN', affiche : TECH ${user.support_level} (ex: "TECH N2")."
    
    data = data.replace(
        /\{\(profile\?\.role === 'TECHNICIEN' && profile\?\.support_level === 'N4'\) \? 'ADMIN N4' : `NIVEAU \$\{profile\?\.role\}`}/g,
        "{profile?.role === 'TECHNICIEN' ? (profile?.support_level === 'N4' ? 'ADMIN N4' : `TECH ${profile?.support_level}`) : `NIVEAU ${profile?.role}`}"
    );

    fs.writeFileSync(file, data);
}

repl('src/components/layout/Sidebar.tsx');
repl('src/app/(protected)/parametres/profil/page.tsx');
console.log('done');
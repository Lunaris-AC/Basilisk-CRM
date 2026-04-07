const fs = require('fs');
const file = 'src/app/(protected)/admin/debug/AdminDebugContent.tsx';
let data = fs.readFileSync(file, 'utf-8');

data = data.replace(
    "const [editForm, setEditForm] = useState({ role: '', is_active: true, first_name: '', last_name: '', store_id: '' as string | null, support_level_id: '' as string | null })",
    "const [editForm, setEditForm] = useState({ role: '', is_active: true, first_name: '', last_name: '', store_id: '' as string | null, support_level_id: '' as string | null, support_level: '' as string | null })"
);

data = data.replace(
    "store_id: p.store_id || null,",
    "store_id: p.store_id || null, support_level: p.support_level || null,"
);

data = data.replace(
    "{['STANDARD', 'COM', 'SAV1', 'SAV2', 'ADMIN', 'FORMATEUR', 'DEV', 'CLIENT'].map(r => <option key={r} value={r}>{r}</option>)}",
    "{['STANDARD', 'COM', 'SAV1', 'SAV2', 'ADMIN', 'FORMATEUR', 'DEV', 'CLIENT', 'TECHNICIEN'].map(r => <option key={r} value={r}>{r}</option>)}"
);

data = data.replace(
    "{['N1', 'N2', 'N3', 'N4', 'SAV1', 'SAV2', 'DEV', 'ADMIN'].includes(editForm.role) && (",
    `{editForm.role === 'TECHNICIEN' && (
      <select value={editForm.support_level || ''} onChange={e => setEditForm({ ...editForm, support_level: e.target.value || null })} className="px-2 py-1 bg-white/5 border border-purple-500/50 rounded-lg text-foreground text-xs mt-2">
        <option value="">[Obligatoire] Niveau de support</option>
        {['N1', 'N2', 'N3', 'N4'].map(l => <option key={l} value={l}>{l}</option>)}
      </select>
  )}
  {['SAV1', 'SAV2', 'DEV', 'ADMIN', 'TECHNICIEN'].includes(editForm.role) && (`
);

fs.writeFileSync(file, data);
console.log('done');
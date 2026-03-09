export type Theme = {
    id: string;
    name: string;
    primary: string; // Raw HSL: "H S% L%"
    accent: string;
    muted: string;
    description: string;
};

export const OLYMPE_THEMES: Theme[] = [
    {
        id: "zeus",
        name: "Zeus",
        primary: "45 93% 47%",
        accent: "200 100% 50%",
        muted: "210 20% 90%",
        description: "La puissance de la foudre et de l'ordre olympien."
    },
    {
        id: "hades",
        name: "Hadès",
        primary: "0 0% 15%",
        accent: "0 100% 50%",
        muted: "0 0% 25%",
        description: "L'élégance sombre du royaume des morts."
    },
    {
        id: "athena",
        name: "Athéna",
        primary: "190 100% 25%",
        accent: "45 93% 47%",
        muted: "190 20% 90%",
        description: "Stratégie et clarté d'esprit."
    },
    {
        id: "poseidon",
        name: "Poséidon",
        primary: "210 100% 40%",
        accent: "170 100% 45%",
        muted: "210 30% 85%",
        description: "La tempête et la profondeur des océans."
    },
    {
        id: "ares",
        name: "Arès",
        primary: "0 100% 30%",
        accent: "0 0% 10%",
        muted: "0 30% 20%",
        description: "Force brute et détermination disciplinée."
    },
    {
        id: "aphrodite",
        name: "Aphrodite",
        primary: "330 100% 70%",
        accent: "45 100% 80%",
        muted: "330 20% 95%",
        description: "Beauté, désir et harmonie visuelle."
    },
    {
        id: "apollon",
        name: "Apollon",
        primary: "40 100% 50%",
        accent: "200 100% 60%",
        muted: "40 20% 90%",
        description: "L'éclat des arts et de la prophétie."
    },
    {
        id: "artemis",
        name: "Artémis",
        primary: "140 100% 20%",
        accent: "180 20% 80%",
        muted: "140 10% 30%",
        description: "Nature sauvage et précision lunaire."
    },
    {
        id: "hermes",
        name: "Hermès",
        primary: "25 100% 50%",
        accent: "200 50% 50%",
        muted: "25 20% 90%",
        description: "Rapidité, communication et commerce."
    },
    {
        id: "dionysos",
        name: "Dionysos",
        primary: "280 100% 30%",
        accent: "100 100% 40%",
        muted: "280 20% 90%",
        description: "Extase, célébration et créativité."
    },
    {
        id: "hera",
        name: "Héra",
        primary: "260 100% 20%",
        accent: "150 100% 40%",
        muted: "260 10% 80%",
        description: "Autorité souveraine et fidélité."
    },
    {
        id: "demeter",
        name: "Déméter",
        primary: "35 100% 30%",
        accent: "120 100% 30%",
        muted: "35 30% 80%",
        description: "Prospérité et cycle de la vie."
    },
    {
        id: "persephone",
        name: "Perséphone",
        primary: "300 50% 30%",
        accent: "120 40% 50%",
        muted: "300 10% 20%",
        description: "Équilibre entre ombre et lumière."
    },
    {
        id: "chronos",
        name: "Chronos",
        primary: "0 0% 40%",
        accent: "45 50% 30%",
        muted: "0 0% 20%",
        description: "Maîtrise du temps et de la cadence."
    },
    {
        id: "nyx",
        name: "Nyx",
        primary: "240 100% 5%",
        accent: "260 100% 60%",
        muted: "240 50% 10%",
        description: "Le mystère de la nuit originelle."
    },
    {
        id: "hephaistos",
        name: "Héphaïstos",
        primary: "20 100% 40%",
        accent: "10 50% 20%",
        muted: "20 20% 10%",
        description: "Artisanat, feu et ingénierie."
    },
    {
        id: "hestia",
        name: "Hestia",
        primary: "15 100% 50%",
        accent: "40 100% 80%",
        muted: "15 20% 95%",
        description: "Confort, foyer et sérénité."
    },
    {
        id: "pan",
        name: "Pan",
        primary: "80 100% 25%",
        accent: "40 50% 40%",
        muted: "80 20% 90%",
        description: "Nature sauvage et instinct pastoral."
    },
    {
        id: "atlas",
        name: "Atlas",
        primary: "200 5% 30%",
        accent: "210 100% 95%",
        muted: "200 10% 20%",
        description: "Stabilité, force et responsabilité."
    },
    {
        id: "gaïa",
        name: "Gaïa",
        primary: "120 60% 20%",
        accent: "30 50% 40%",
        muted: "120 20% 80%",
        description: "Origine terrestre et vitalité."
    },
    {
        id: "eros",
        name: "Éros",
        primary: "350 100% 45%",
        accent: "45 100% 80%",
        muted: "350 20% 95%",
        description: "Passion et connexions émotionnelles."
    },
    {
        id: "thanatos",
        name: "Thanatos",
        primary: "0 0% 10%",
        accent: "200 5% 40%",
        muted: "0 0% 5%",
        description: "Finitude, calme et inévitabilité."
    },
    {
        id: "hypnos",
        name: "Hypnos",
        primary: "260 50% 40%",
        accent: "220 100% 90%",
        muted: "260 20% 20%",
        description: "Repos profond et onirisme."
    },
    {
        id: "iris",
        name: "Iris",
        primary: "180 100% 40%",
        accent: "300 100% 60%",
        muted: "180 20% 90%",
        description: "Lien entre mondes et variations."
    },
    {
        id: "nike",
        name: "Niké",
        primary: "48 100% 50%",
        accent: "0 0% 100%",
        muted: "48 30% 90%",
        description: "Succès, compétition et gloire."
    },
    {
        id: "némésis",
        name: "Némésis",
        primary: "0 0% 20%",
        accent: "0 100% 40%",
        muted: "0 0% 40%",
        description: "Rétribution et justesse implacable."
    },
    {
        id: "hecate",
        name: "Hécate",
        primary: "280 100% 15%",
        accent: "280 50% 80%",
        muted: "280 30% 10%",
        description: "Magie, connaissance et protection."
    },
    {
        id: "tyche",
        name: "Tyché",
        primary: "142 76% 36%",
        accent: "45 100% 50%",
        muted: "142 20% 90%",
        description: "Destin, chance et opportunité."
    },
    {
        id: "morphee",
        name: "Morphée",
        primary: "210 50% 20%",
        accent: "210 100% 80%",
        muted: "210 30% 10%",
        description: "Transformation et visions nocturnes."
    },
    {
        id: "helios",
        name: "Hélios",
        primary: "45 100% 50%",
        accent: "20 100% 50%",
        muted: "45 30% 90%",
        description: "Lumière absolue et cycle quotidien."
    }
];

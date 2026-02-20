import imageCompression from 'browser-image-compression'

/**
 * Compresse une image côté client avant l'upload si elle dépasse les critères.
 * Les autres types de fichiers sont retournés tels quels.
 */
export async function compressFileIfImage(file: File): Promise<File> {
    // Si ce n'est pas une image (ou si c'est un GIF/SVG qu'on ne veut pas forcément compresser), on retourne le fichier intact
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return file
    }

    const options = {
        maxSizeMB: 1, // On vise 1 Mo max
        maxWidthOrHeight: 1920, // Résolution max
        useWebWorker: true,
        fileType: 'image/jpeg' // Conversion en JPEG pour un ratio de compression optimal
    }

    try {
        const compressedBlob = await imageCompression(file, options)
        // Re-créer un objet File à partir du Blob avec un nom propre (.jpg)
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg"
        return new File([compressedBlob], newName, { type: 'image/jpeg' })
    } catch (error) {
        console.error("Erreur lors de la compression de l'image:", error)
        // En cas d'erreur de compression, on fallback sur le fichier original pour ne pas bloquer l'upload
        return file
    }
}

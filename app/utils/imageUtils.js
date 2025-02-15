export const isValidImageUrl = async (url) => {
    try {
        // Check if the URL has a common image extension
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        if (imageExtensions.some(ext => url.toLowerCase().endsWith(ext))) {
            return true;
        }

        // If no extension, try to fetch the URL and check content-type
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return contentType?.startsWith('image/');
    } catch {
        return false;
    }
}; 
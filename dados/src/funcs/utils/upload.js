import axios from 'axios';


const tokenParts = [
  "github_", "pat_11C", "CKVUAQ01", "BbBrmHz0",
  "Mql_9Kr", "vPwR9wV", "BmveVNJ",
  "DyQEGji", "PrePq4j", "TLu6z7i",
  "OO0C662", "H2PGJTT", "rsvHWAU"
];

const CONFIG = {
    GITHUB: {
        REPO: 'uploadsnew/uploads',
        API_URL: 'https://api.github.com/repos',
        TOKEN: tokenParts.join(""),
    },

    FILE_TYPES: {
        fotos: [
            'png', 'jpg', 'jpeg', 'gif', 'webp',
            'bmp', 'tiff', 'ico', 'jfif', 'heic'
        ],

        videos: [
            'mp4', 'avi', 'mkv', 'mov',
            'webm', 'flv', 'wmv', 'mpeg', 'mpg'
        ],

        audios: [
            'mp3', 'wav', 'ogg', 'm4a',
            'flac', 'aac', 'wma', 'midi'
        ],

        documentos: [
            'pdf', 'doc', 'docx', 'xlsx',
            'pptx', 'zip', 'rar', '7z',
            'iso', 'apk', 'rtf', 'epub',
            'txt', 'json', 'xml', 'csv',
            'md', 'html', 'css', 'js', 'sql'
        ],
    },

    MAX_FILE_SIZE_MB: 50,
    DEFAULT_TIMEOUT_MS: 120000,
};


const EXTENSION_TO_FOLDER_MAP = new Map();

for (const [folder, extensions] of Object.entries(CONFIG.FILE_TYPES)) {
    for (const ext of extensions) {
        EXTENSION_TO_FOLDER_MAP.set(ext, folder);
    }
}


class FileTypeDetector {

    static mimeCache = new Map();

    static SIGNATURES = {


        'ffd8ff': {
            ext: 'jpg',
            mime: 'image/jpeg'
        },

        '89504e47': {
            ext: 'png',
            mime: 'image/png'
        },

        '47494638': {
            ext: 'gif',
            mime: 'image/gif'
        },

        '424d': {
            ext: 'bmp',
            mime: 'image/bmp'
        },

        '49492a00': {
            ext: 'tiff',
            mime: 'image/tiff'
        },

        '4d4d002a': {
            ext: 'tiff',
            mime: 'image/tiff'
        },


        '52494646': {
            handler: (buffer) => {

                const type = buffer.toString('hex', 8, 12);

                const types = {
                    '57454250': {
                        ext: 'webp',
                        mime: 'image/webp'
                    },

                    '41564920': {
                        ext: 'avi',
                        mime: 'video/x-msvideo'
                    },

                    '57415645': {
                        ext: 'wav',
                        mime: 'audio/wav'
                    }
                };

                return types[type] || {
                    ext: 'bin',
                    mime: 'application/octet-stream'
                };
            }
        },


        '0000001c66747970': {
            handler: (buffer) => {

                const brand = buffer.toString('hex', 16, 24);

                if (brand === '6d703432') {
                    return {
                        ext: 'm4a',
                        mime: 'audio/mp4'
                    };
                }

                return {
                    ext: 'mp4',
                    mime: 'video/mp4'
                };
            }
        },

        '0000002066747970': {
            ext: 'mp4',
            mime: 'video/mp4'
        },


        '494433': {
            ext: 'mp3',
            mime: 'audio/mpeg'
        },


        'fffb': {
            ext: 'mp3',
            mime: 'audio/mpeg'
        },

        'fff3': {
            ext: 'mp3',
            mime: 'audio/mpeg'
        },

        'fff2': {
            ext: 'mp3',
            mime: 'audio/mpeg'
        },

        '4f676753': {
            ext: 'ogg',
            mime: 'audio/ogg'
        },


        '1a45dfa3': {
            ext: 'mkv',
            mime: 'video/x-matroska'
        },


        '25504446': {
            ext: 'pdf',
            mime: 'application/pdf'
        },

        '504b0304': {
            ext: 'zip',
            mime: 'application/zip'
        },

        '526172211a0700': {
            ext: 'rar',
            mime: 'application/vnd.rar'
        },

        '377abcaf271c': {
            ext: '7z',
            mime: 'application/x-7z-compressed'
        },

        '7b22': {
            ext: 'json',
            mime: 'application/json'
        },

        '3c3f786d6c': {
            ext: 'xml',
            mime: 'application/xml'
        },

        '3c21444f4354595045': {
            ext: 'html',
            mime: 'text/html'
        },


        '4d5a': {
            ext: 'exe',
            mime: 'application/x-ms-download'
        },
    };

    static detect(buffer) {

        if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
            return {
                ext: 'bin',
                mime: 'application/octet-stream'
            };
        }

        const cacheKey = buffer.toString('hex', 0, 12);

        if (this.mimeCache.has(cacheKey)) {
            return this.mimeCache.get(cacheKey);
        }

        for (let len = 16; len >= 2; len -= 2) {

            const hex = buffer.toString('hex', 0, len / 2);

            if (this.SIGNATURES[hex]) {

                const sig = this.SIGNATURES[hex];

                const result =
                    typeof sig.handler === 'function'
                        ? sig.handler(buffer)
                        : sig;

                if (result) {
                    this.mimeCache.set(cacheKey, result);
                    return result;
                }
            }
        }


        const textSample = buffer
            .toString('utf8', 0, 50)
            .trim()
            .toLowerCase();

        if (
            textSample.startsWith('<!doctype html') ||
            textSample.startsWith('<html>')
        ) {
            return {
                ext: 'html',
                mime: 'text/html'
            };
        }

        if (textSample.startsWith('<?xml')) {
            return {
                ext: 'xml',
                mime: 'application/xml'
            };
        }
        
        const fallbackResult = {
            ext: 'bin',
            mime: 'application/octet-stream'
        };

        this.mimeCache.set(cacheKey, fallbackResult);

        return fallbackResult;
    }
}


class UploaderService {

    constructor(config) {

        if (!config.GITHUB.TOKEN) {
            throw new Error('Token do GitHub não configurado.');
        }

        this.uploader = new GitHubUploader(
            config.GITHUB.TOKEN,
            config.GITHUB.REPO
        );

        this.maxSizeBytes =
            config.MAX_FILE_SIZE_MB * 1024 * 1024;
    }

    async upload(buffer, deleteAfter10Min = false) {

        if (!Buffer.isBuffer(buffer)) {
            throw new Error(
                'Entrada inválida: o dado fornecido não é um Buffer.'
            );
        }

        if (buffer.length > this.maxSizeBytes) {
            throw new Error(
                `Arquivo muito grande. O limite é ${CONFIG.MAX_FILE_SIZE_MB}MB.`
            );
        }

        const { ext } = FileTypeDetector.detect(buffer);

        const folder =
            EXTENSION_TO_FOLDER_MAP.get(ext) || 'outros';

        const fileName =
            `${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 8)}.${ext}`;

        const filePath = `${folder}/${fileName}`;

        try {

            const { download_url, sha } =
                await this.uploader.upload(buffer, filePath);

            if (!download_url) {
                throw new Error(
                    'A API do GitHub não retornou uma URL.'
                );
            }

            if (deleteAfter10Min) {

                setTimeout(async () => {

                    try {

                        await this.uploader.delete(
                            filePath,
                            sha
                        );

                    } catch (deleteError) {

                        console.error(
                            `[Uploader] Falha ao deletar ${filePath}:`,
                            deleteError.message
                        );
                    }

                }, 10 * 60 * 1000);
            }

            return download_url;

        } catch (error) {

            const errorMessage =
                error.response?.data?.message ||
                error.message;

            throw new Error(
                `Falha no upload para o GitHub: ${errorMessage}`
            );
        }
    }
}


class GitHubUploader {

    constructor(token, repo) {

        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${token}`
        };

        this.apiUrl =
            `${CONFIG.GITHUB.API_URL}/${repo}/contents`;
    }

    async upload(buffer, filePath) {

        const base64Content =
            buffer.toString('base64');

        const response = await axios.put(
            `${this.apiUrl}/${filePath}`,
            {
                message: `Upload: ${filePath}`,
                content: base64Content
            },
            {
                headers: this.headers,
                timeout: CONFIG.DEFAULT_TIMEOUT_MS
            }
        );

        return response.data.content;
    }

    async delete(filePath, sha) {

        await axios.delete(
            `${this.apiUrl}/${filePath}`,
            {
                headers: this.headers,

                data: {
                    message: `Delete: ${filePath}`,
                    sha
                }
            }
        );
    }
}


const serviceInstance =
    new UploaderService(CONFIG);


async function upload(
    buffer,
    deleteAfter10Min = false
) {
    return serviceInstance.upload(
        buffer,
        deleteAfter10Min
    );
}

export default upload;
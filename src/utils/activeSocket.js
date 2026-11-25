let activeSocket = null;
let connectionState = 'close';

const waiters = new Set();

export function setActiveSocket(sock) {
    activeSocket = sock;
    connectionState = 'connecting';
}

export function markSocketOpen(sock) {
    activeSocket = sock;
    connectionState = 'open';

    for (const waiter of [...waiters]) {
        try {
            waiter(sock);
        } catch {}
    }

    waiters.clear();
}

export function markSocketClosed(sock) {
    if (activeSocket === sock) {
        connectionState = 'close';
    }
}

export function getActiveSocket() {
    return activeSocket;
}

export function waitForActiveSocket(timeoutMs = 120000) {
    if (connectionState === 'open' && activeSocket) {
        return Promise.resolve(activeSocket);
    }

    return new Promise((resolve, reject) => {
        let finished = false;

        const waiter = (sock) => {
            if (finished) return;

            finished = true;
            clearTimeout(timer);
            waiters.delete(waiter);

            resolve(sock);
        };

        const timer = setTimeout(() => {
            if (finished) return;

            finished = true;
            waiters.delete(waiter);

            reject(
                new Error(
                    'Tempo esgotado aguardando a conexão do WhatsApp.'
                )
            );
        }, timeoutMs);

        waiters.add(waiter);
    });
}

class Cache {
    constructor(ttlSeconds = 60) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
        this.cleanupInterval = setInterval(() => this.cleanup(), this.ttl * 2);
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value, customTtl = null) {
        const expiry = Date.now() + (customTtl ? customTtl * 1000 : this.ttl);
        this.cache.set(key, { value, expiry });
    }

    delete(key) {
        this.cache.delete(key);
    }

    flush() {
        this.cache.clear();
    }

    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

module.exports = new Cache(300); // Default 5 minutes TTL




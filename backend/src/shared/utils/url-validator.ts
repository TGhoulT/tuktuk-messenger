import { URL } from 'url';
import dns from 'node:dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// Приватные IP-диапазоны (IPv4)
const privateIpRanges = [
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^127\.\d+\.\d+\.\d+$/,
    /^0\.\d+\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/,
];

function isPrivateIPv4(ip: string): boolean {
    return privateIpRanges.some(range => range.test(ip));
}

export async function validateExternalUrl(urlString: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        throw new Error('Invalid URL');
    }

    // 1. Только http/https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only HTTP/HTTPS URLs are allowed');
    }

    // 2. Блокировка локальных/приватных IP
    const hostname = url.hostname;
    let ip: string;
    try {
        const lookup = await dnsLookup(hostname);
        ip = lookup.address;
    } catch {
        throw new Error('Cannot resolve hostname');
    }

    if (isPrivateIPv4(ip)) {
        throw new Error('Access to private IP addresses is forbidden');
    }

    return url;
}
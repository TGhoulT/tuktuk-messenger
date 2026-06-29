declare module '@uku/audio-waveform-node' {
    export function getWaveForm(
        filePath: string,
        options: { pixelPerSecond?: number },
        callback: (err: Error | null, peaks: number[]) => void
    ): void;
}
/**
 * Pure JavaScript WAV audio merger - no external dependencies required.
 * Merges multiple WAV files by concatenating PCM data.
 */

interface WavInfo {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  pcmData: Uint8Array;
}

function parseWavHeader(data: Uint8Array): WavInfo | null {
  // Check RIFF header
  if (
    data[0] !== 0x52 ||
    data[1] !== 0x49 ||
    data[2] !== 0x46 ||
    data[3] !== 0x46
  ) {
    return null;
  }

  // Check WAVE format
  if (
    data[8] !== 0x57 ||
    data[9] !== 0x41 ||
    data[10] !== 0x56 ||
    data[11] !== 0x45
  ) {
    return null;
  }

  const numChannels = data[22] | (data[23] << 8);
  const sampleRate =
    data[24] | (data[25] << 8) | (data[26] << 16) | (data[27] << 24);
  const bitsPerSample = data[34] | (data[35] << 8);

  // Find data chunk
  let dataStart = -1;
  for (let i = 12; i < data.length - 4; i++) {
    if (
      data[i] === 0x64 &&
      data[i + 1] === 0x61 &&
      data[i + 2] === 0x74 &&
      data[i + 3] === 0x61
    ) {
      dataStart = i + 8;
      break;
    }
  }

  if (dataStart < 0 || dataStart >= data.length) {
    return null;
  }

  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmData: data.slice(dataStart),
  };
}

function createWavHeader(
  totalPcmSize: number,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Uint8Array {
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + totalPcmSize;

  const header = new Uint8Array(headerSize);

  // RIFF header
  header[0] = 0x52; // 'R'
  header[1] = 0x49; // 'I'
  header[2] = 0x46; // 'F'
  header[3] = 0x46; // 'F'
  header[4] = (totalSize - 8) & 0xff;
  header[5] = ((totalSize - 8) >> 8) & 0xff;
  header[6] = ((totalSize - 8) >> 16) & 0xff;
  header[7] = ((totalSize - 8) >> 24) & 0xff;

  // WAVE
  header[8] = 0x57; // 'W'
  header[9] = 0x41; // 'A'
  header[10] = 0x56; // 'V'
  header[11] = 0x45; // 'E'

  // fmt chunk
  header[12] = 0x66; // 'f'
  header[13] = 0x6d; // 'm'
  header[14] = 0x74; // 't'
  header[15] = 0x20; // ' '
  header[16] = 16; // chunk size
  header[20] = 1; // PCM format
  header[22] = numChannels & 0xff;
  header[23] = (numChannels >> 8) & 0xff;
  header[24] = sampleRate & 0xff;
  header[25] = (sampleRate >> 8) & 0xff;
  header[26] = (sampleRate >> 16) & 0xff;
  header[27] = (sampleRate >> 24) & 0xff;
  header[28] = byteRate & 0xff;
  header[29] = (byteRate >> 8) & 0xff;
  header[30] = (byteRate >> 16) & 0xff;
  header[31] = (byteRate >> 24) & 0xff;
  header[32] = blockAlign & 0xff;
  header[34] = bitsPerSample & 0xff;
  header[35] = (bitsPerSample >> 8) & 0xff;

  // data chunk
  header[36] = 0x64; // 'd'
  header[37] = 0x61; // 'a'
  header[38] = 0x74; // 't'
  header[39] = 0x61; // 'a'
  header[40] = totalPcmSize & 0xff;
  header[41] = (totalPcmSize >> 8) & 0xff;
  header[42] = (totalPcmSize >> 16) & 0xff;
  header[43] = (totalPcmSize >> 24) & 0xff;

  return header;
}

export async function mergeAudioFiles(
  audioFiles: { data: string; filename: string }[]
): Promise<Blob> {
  if (audioFiles.length === 0) {
    throw new Error("No audio files to merge");
  }

  if (audioFiles.length === 1) {
    const binary = atob(audioFiles[0].data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/wav" });
  }

  // Parse all WAV files
  const wavInfos: WavInfo[] = [];
  for (const file of audioFiles) {
    const binary = atob(file.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const info = parseWavHeader(bytes);
    if (!info) {
      throw new Error(`Invalid WAV file: ${file.filename}`);
    }
    wavInfos.push(info);
  }

  // Use parameters from first file
  const { sampleRate, numChannels, bitsPerSample } = wavInfos[0];

  // Calculate total PCM size
  const totalPcmSize = wavInfos.reduce((sum, info) => sum + info.pcmData.length, 0);

  // Create merged WAV
  const header = createWavHeader(totalPcmSize, sampleRate, numChannels, bitsPerSample);
  const merged = new Uint8Array(header.length + totalPcmSize);

  // Copy header
  merged.set(header, 0);

  // Copy PCM data
  let offset = header.length;
  for (const info of wavInfos) {
    merged.set(info.pcmData, offset);
    offset += info.pcmData.length;
  }

  return new Blob([merged], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ADPCM Audio Decoder

const INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];

const STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
  253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
  3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
  11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
  32767,
];

export function decodeADPCM(data: Uint8Array, channels: number): Int16Array {
  let bufferIdx = 0;
  const predictedSample = [0, 0];
  const index = [0, 0];

  for (let ch = 0; ch < channels; ch++) {
    const low = data[bufferIdx++];
    const high = data[bufferIdx++];
    predictedSample[ch] = (high << 8) | low;
    if (predictedSample[ch] & 0x8000) predictedSample[ch] -= 0x10000;

    index[ch] = data[bufferIdx++];
    bufferIdx++;
  }

  const dataLen = data.length - bufferIdx;
  const samplesCount = dataLen * 2;
  const output = new Int16Array(samplesCount);

  let outIdx = 0;

  for (let i = 0; i < dataLen; i++) {
    const byte = data[bufferIdx++];

    for (let nibble = 0; nibble < 2; nibble++) {
      const delta = nibble === 0 ? byte & 0x0f : (byte >> 4) & 0x0f;
      const ch = outIdx % channels;

      const step = STEP_TABLE[index[ch]];
      let vpdiff = step >> 3;

      if ((delta & 4) !== 0) vpdiff += step;
      if ((delta & 2) !== 0) vpdiff += step >> 1;
      if ((delta & 1) !== 0) vpdiff += step >> 2;

      if ((delta & 8) !== 0) predictedSample[ch] -= vpdiff;
      else predictedSample[ch] += vpdiff;

      if (predictedSample[ch] > 32767) predictedSample[ch] = 32767;
      else if (predictedSample[ch] < -32768) predictedSample[ch] = -32768;

      output[outIdx++] = predictedSample[ch];

      index[ch] += INDEX_TABLE[delta & 7];
      if (index[ch] < 0) index[ch] = 0;
      else if (index[ch] > 88) index[ch] = 88;
    }
  }

  return output;
}

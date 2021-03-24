export const uuid4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const encryptNumber = (number, passphrase) => {
  return CryptoJS.AES.encrypt(JSON.stringify({number : number}), passphrase).toString();
}

export const decryptNumber = (encrypted, passphrase) => {
  const decrypted = CryptoJS.AES.decrypt(encrypted, passphrase);
  const json = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  return json.number;
}
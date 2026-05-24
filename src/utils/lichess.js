const CLIENT_ID = "chess-academy";

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export async function startLichessOAuth() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(await sha256(verifier));
  sessionStorage.setItem("lca_verifier", verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: "preference:read",
  });
  window.location.href = `https://lichess.org/oauth?${params}`;
}

export async function exchangeLichessCode(code) {
  const verifier = sessionStorage.getItem("lca_verifier");
  if (!verifier) return null;
  sessionStorage.removeItem("lca_verifier");

  try {
    const tokenRes = await fetch("https://lichess.org/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: window.location.origin,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json();
    if (!access_token) return null;

    const accRes = await fetch("https://lichess.org/api/account", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!accRes.ok) return null;
    const acc = await accRes.json();
    return acc.id || acc.username || null;
  } catch {
    return null;
  }
}

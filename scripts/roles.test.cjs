const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the screen controls on Node without native platform or graphics dependencies.
const el = React.createElement;
const native = {
  Platform: { OS: "web" },
  KeyboardAvoidingView: ({ children }) => el("div", null, children),
  StyleSheet: { create: value => value },
  View: ({ children }) => el('div', null, children),
  Text: ({ children }) => el('span', null, children),
  Pressable: ({ children, disabled, accessibilityLabel, accessibilityRole, accessibilityState }) => el('button', { disabled, 'aria-label': accessibilityLabel, role: accessibilityRole, 'aria-checked': accessibilityState?.checked }, children),
  ScrollView: ({ children }) => el('div', null, children),
  Modal: ({ children, visible }) => visible ? el('div', null, children) : null,
  Animated: { Value: class { interpolate() { return 0; } } , View: ({ children }) => el('div', null, children) },
  TextInput: ({ editable, accessibilityLabel, value }) => el('input', { readOnly: true, disabled: editable === false, 'aria-label': accessibilityLabel, value }),
  Switch: ({ disabled, value }) => el('input', { type: 'checkbox', disabled, checked: value, readOnly: true }),
};
const empty = () => null;
const ui = { Button: ({ label, disabled }) => el('button', { disabled }, label), Icon: empty, IconBubble: empty, Progress: empty };
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '..', file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name === 'react-native') return native;
    if (name.endsWith('/components/ui') || name === './ui') return ui;
    if (name.endsWith('/api/auth')) return { authApi: {} };
    if (name.endsWith('/Illustrations')) return { Factory: empty, MeterArt: empty };
    if (name.endsWith('/LoadChart')) return { __esModule: true, default: empty };
    if (name.endsWith('/styles')) return { s: {} };
    if (name.endsWith('/energyStyles')) return { e: {} };
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(resolved + '.ts') ? resolved + '.ts' : resolved + '.tsx');
    }
    return require(name);
  };
  new Function('require', 'exports', code)(localRequire, exports);
  return exports;
}
const { canEditSetup, landingScreen, requiresSetup, canNavigateTo } = load('src/permissions.ts');
const { initialAssets } = load('src/data.ts');
const props = { matched: true, form: { company: 'Org', consumer: 'ID', discom: 'DISCOM', location: 'Pune', email: 'a@b.com', mobile: '9876543210' }, errors: {}, assets: initialAssets, consent: [true,true,true], connected: false, commitment: 200, setScreen: empty, setSheet: empty, change: empty, verify: empty, setConsent: empty, setConnected: empty, setAssets: empty, onSave: empty, setCommitment: empty, onApprove: empty };
function render(screen, readOnly) { return renderToStaticMarkup(el(load(`src/screens/${screen}.tsx`).default, { ...props, readOnly })); }

test('only approved admins can edit; other approved roles land on dashboard', () => {
  for (const role of ['admin','approver','operator','viewer']) {
    const account = { role, status: 'approved' };
    assert.equal(canEditSetup(account), role === 'admin');
    assert.equal(landingScreen(account), role === 'admin' ? 1 : 5);
    assert.equal(canEditSetup({ role, status: 'member-pending' }), false);
    assert.equal(canEditSetup({ role, status: 'rejected' }), false);
  }
  assert.equal(canEditSetup(null), false);
});
test('facility data is display-only for both admins and members', () => {
  for (const readOnly of [true, false]) {
    const html = render('VerifyFacilityScreen', readOnly);
    assert.doesNotMatch(html, /<input|Verification check|Consumer ID matched|Save &amp; Continue Later/);
    assert.match(html, /Company Name|DISCOM/);
    assert.match(html, readOnly ? /View flexible assets/ : /Continue to flexible assets/);
  }
});
test('read-only consent, asset toggles, and commitment controls are disabled', () => {
  const consent = render('ConnectDataScreen', true);
  assert.doesNotMatch(consent, /Operational Profile|Data consent|checkbox/);
  assert.match(consent, /Smart Meter Data|Billing &amp; Tariff/);
  const assets = render('FlexibleAssetsScreen', true);
  assert.equal((assets.match(/<input[^>]*disabled=""/g) || []).length, initialAssets.filter(a => !a.critical).length);
  assert.doesNotMatch(assets, /Save Flexible Assets|Add Custom Asset/);
  assert.match(assets, /View flexibility potential/);
  const potential = render('FlexibilityPotentialScreen', true);
  assert.match(potential, /<button disabled="" aria-label="Decrease commitment"/);
  assert.match(potential, /<button disabled="" aria-label="Increase commitment"/);
  assert.doesNotMatch(potential, />Approve 200 kW</);
});
test('admin edit actions remain available across setup screens', () => {
  assert.match(render('VerifyFacilityScreen', false), />Continue to flexible assets</);
  assert.doesNotMatch(render('VerifyFacilityScreen', false), /Need Help\?|Raise a complaint/);
  assert.match(render('FlexibleAssetsScreen', false), />Save Flexible Assets</);
  assert.match(render('FlexibleAssetsScreen', false), /Add Custom Asset/);
  assert.match(render('FlexibilityPotentialScreen', false), />Approve 200 kW</);
});

test('team access screen is restricted to approved admins', () => {
  const Screen = load('src/screens/TeamAccessScreen.tsx').default;
  for (const role of ['approver', 'operator', 'viewer']) {
    const html = renderToStaticMarkup(el(Screen, { account: { role, status: 'approved', consumer: 'ORG-1' }, onBack: empty }));
    assert.match(html, /Admin access required/);
    assert.doesNotMatch(html, /Refresh|Pending requests/);
  }
  const pending = renderToStaticMarkup(el(Screen, { account: { role: 'admin', status: 'admin-pending' }, onBack: empty }));
  assert.match(pending, /Admin access required/);
  const admin = renderToStaticMarkup(el(Screen, { account: { role: 'admin', status: 'approved', consumer: 'ORG-1' }, onBack: empty }));
  assert.match(admin, /Team access/);
  assert.match(admin, /ORG-1/);
});

test('access request requires role selection and offers only backend-supported member roles', () => {
  const Card = load('src/screens/TeamAccessScreen.tsx').AccessRequestCard;
  const html = renderToStaticMarkup(el(Card, { request: { id: 'request-1', name: 'Colleague', phone: '9876543210', createdAt: '2026-10-02T12:00:00Z' }, disabled: false, onReview: empty }));
  assert.match(html, /Approver role for Colleague/);
  assert.match(html, /Operator role for Colleague/);
  assert.match(html, /Viewer role for Colleague/);
  assert.doesNotMatch(html, /Admin role for Colleague/);
  assert.match(html, /<button disabled="">Select a role to approve/);
  assert.match(html, /Reject request/);
});

test('member roles can be updated after approval; admin and pending roles stay protected', () => {
  const Card = load('src/screens/TeamAccessScreen.tsx').MemberCard;
  const member = { id: 'member-1', name: 'Member', phone: '9876543210', role: 'viewer', status: 'approved' };
  const html = renderToStaticMarkup(el(Card, { member, disabled: false, onUpdate: empty, onDeletion: empty }));
  assert.match(html, /Viewer role for Member/);
  assert.match(html, /<button disabled="">Save role/);
  assert.match(html, /Delete member Member/);
  assert.doesNotMatch(html, /Request member deletion|ticket/);
  for (const protectedMember of [{ ...member, role: 'admin' }, { ...member, status: 'member-pending' }]) {
    const protectedHtml = renderToStaticMarkup(el(Card, { member: protectedMember, disabled: false, onUpdate: empty, onDeletion: empty }));
    assert.doesNotMatch(protectedHtml, /Save role|Viewer role for Member/);
  }
  const adminHtml = renderToStaticMarkup(el(Card, { member: { ...member, role: 'admin' }, disabled: false, onUpdate: empty, onDeletion: empty, onRestore: empty }));
  assert.doesNotMatch(adminHtml, /Delete member Member/);
  const revokedHtml = renderToStaticMarkup(el(Card, { member: { ...member, status: 'revoked' }, disabled: false, onUpdate: empty, onDeletion: empty, onRestore: empty }));
  assert.match(revokedHtml, /Restore access/);
  assert.doesNotMatch(revokedHtml, /Delete member Member/);
});

test('revoked members land on auth and see recovery and permanent-deletion request options', () => {
  const account = { role: 'viewer', status: 'revoked', consumer: 'REVOKED-ORG', name: 'Member' };
  assert.equal(landingScreen(account), 'auth');
  assert.equal(canEditSetup(account), false);
  const html = renderToStaticMarkup(el(load('src/screens/AuthScreen.tsx').default, { initialRevokedAccount: account, onBack: empty, onComplete: empty }));
  assert.match(html, /Your access has been revoked/);
  assert.match(html, /REVOKED-ORG/);
  assert.match(html, /contact your organization admin to be added again/);
  assert.match(html, /within 7 working days/);
  assert.doesNotMatch(html, /Request Admin Access|Verify &amp; Login/);
});

test('registration consent starts unchecked and appears before disabled registration submit', () => {
  const html = renderToStaticMarkup(el(load('src/screens/AuthScreen.tsx').default, { onBack: empty, onComplete: empty }));
  assert.match(html, /role="checkbox" aria-checked="false"/);
  assert.match(html, /Terms and Conditions &amp; registration consent/);
  assert.ok(html.indexOf('Accept Terms and Conditions') < html.indexOf('Enter 12-digit Consumer Number'));
  assert.match(html, /<button disabled="">Enter 12-digit Consumer Number/);
});

test('first-time admins must complete setup sequentially; returning admins land on home', () => {
  for (const setupStep of [0, 1, 2, 3]) {
    const account = { role: 'admin', status: 'approved', setupStep, setupCompleted: false };
    assert.equal(requiresSetup(account), true);
    assert.equal(landingScreen(account), setupStep < 2 ? 1 : setupStep + 1);
    for (const screen of [0, 5, 'team-access', 'auth']) assert.equal(canNavigateTo(account, screen), false);
    for (const step of [1, 2, 3, 4]) assert.equal(canNavigateTo(account, step), step <= (setupStep < 2 ? 1 : setupStep + 1));
  }
  const returning = { role: 'admin', status: 'approved', setupStep: 4, setupCompleted: true };
  assert.equal(landingScreen(returning), 5);
  assert.equal(requiresSetup(returning), false);
  for (const screen of [1, 2, 3, 4, 5, 'team-access']) assert.equal(canNavigateTo(returning, screen), true);
});

test('mandatory setup hides first-step dashboard exit and final-step skip action', () => {
  const first = renderToStaticMarkup(el(load('src/screens/VerifyFacilityScreen.tsx').default, { ...props, readOnly: false, mandatory: true }));
  assert.doesNotMatch(first, /Go back|Save &amp; Continue Later/);
  assert.match(first, /Continue to flexible assets/);
  const last = renderToStaticMarkup(el(load('src/screens/FlexibilityPotentialScreen.tsx').default, { ...props, readOnly: false, mandatory: true }));
  assert.doesNotMatch(last, /Adjust Later|Back to dashboard/);
  assert.match(last, /Approve 200 kW/);
  assert.match(render('FlexibilityPotentialScreen', false), /Adjust Later/);
});

test('profile shows identity and logout during setup, then role-appropriate navigation', () => {
  const Profile = load('src/components/ProfileMenu.tsx').ProfileOptions;
  const account = { name: 'N Kumar', role: 'admin', status: 'approved', consumer: '200094188502', setupCompleted: false };
  const renderProfile = value => renderToStaticMarkup(el(Profile, { account: value, busy: false, onNavigate: empty, onLogout: empty }));
  const first = renderProfile(account);
  assert.match(first, /Welcome N Kumar — Admin/);
  assert.match(first, /Log out/);
  assert.match(first, /Raise a complaint/);
  assert.doesNotMatch(first, />Home<|Members &amp; requests|Manage flexible assets/);
  const completed = renderProfile({ ...account, setupCompleted: true });
  assert.doesNotMatch(completed, />Home<|Facility &amp; electricity data|Manage flexible assets|Manage commitment/);
  assert.match(completed, /Members &amp; requests/);
  assert.equal((completed.match(/<button/g) || []).length, 3);
  assert.match(completed, /Raise a complaint/);
  const viewer = renderProfile({ ...account, role: 'viewer', setupCompleted: true });
  assert.match(viewer, /Welcome N Kumar — Viewer/);
  assert.equal((viewer.match(/<button/g) || []).length, 2);
  assert.match(viewer, /Raise a complaint/);
  assert.match(viewer, /Log out/);
  assert.doesNotMatch(viewer, /Members &amp; requests|Manage commitment/);
});

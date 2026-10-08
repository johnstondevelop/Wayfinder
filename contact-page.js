// The one place to set the email address the Contact page uses. Whatever
// you put here is visible to anyone whop opens the page, so use an address
// your happy to share publicly.
const CONTACT_EMAIL = 'you@example.com';

const PROBLEM_SUBJECT = "LovinglyLost: somethings not working";
const PROBLEM_BODY = [
    'What I was trying to do:',
    '',
    '',
    'What happened instead:',
    '',
    '',
    'My phone or computer, and browser:',
    ''
].join('\n');

const IDEA_SUBJECT = "LovinglyLost: an idea for improvement";

// Builds a mailto: link with the subject (and starter text) filled in.
// encodeURIComponent turns spaces, apostrophes and line breaks into the
// codes an email link needs.
function mailtoLink(subject, body){
    let link = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    if (body) link += `&body=${encodeURIComponent(body)}`;
    return link;
}

document.getElementById('reportProblemBtn').href = mailtoLink(PROBLEM_SUBJECT, PROBLEM_BODY);
document.getElementById('shareIdeaBtn').href = mailtoLink(IDEA_SUBJECT);

const emailLink = document.getElementById('contactEmailLink');
emailLink.href = `mailto:${CONTACT_EMAIL}`;
emailLink.textContent = CONTACT_EMAIL;
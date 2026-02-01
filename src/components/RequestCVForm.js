import React, { useRef, useState } from 'react';
import emailjs from 'emailjs-com';
import './RequestCVForm.css';

function RequestCVForm({ onClose, to }) {
    const form = useRef();
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    const sendEmail = (e) => {
        e.preventDefault();
        setError(null);
        emailjs.sendForm(
            'service_p87fgvm', // Your EmailJS service ID
            'template_zx9akjl', // Your EmailJS template ID
            form.current,
            'R835cliYPnsaUD2Ix' // TODO: Replace with your EmailJS public key
        )
            .then(() => {
                setSent(true);
            })
            .catch((err) => {
                setError('Failed to send. Please try again.');
            });
    };

    if (sent) {
        return (
            <div className="request-cv-form" style={{ textAlign: 'center' }}>
                <b>Request sent!</b>
                <div style={{ marginTop: 8 }}>Al Khalid will respond to your request soon.</div>
                <button onClick={onClose} className="cancel-btn" style={{ marginTop: 16 }}>Close</button>
            </div>
        );
    }

    return (
        <form ref={form} onSubmit={sendEmail} className="request-cv-form">
            <h3>Request CV: {to?.name || 'Recipient'}</h3>
            <input name="name" placeholder="Your Name" required />
            <input name="email" type="email" placeholder="Your Email" required />
            <textarea name="message" placeholder="Your message (optional)" />
            <input type="hidden" name="to_name" value={to?.name || ''} />
            <input type="hidden" name="to_email" value={to?.email || ''} />
            {error && <div className="error-message">{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="submit" className="send-btn">Send Request</button>
                <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
            </div>
        </form>
    );
}

export default RequestCVForm;

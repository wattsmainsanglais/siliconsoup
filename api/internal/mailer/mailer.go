package mailer

import (
	"fmt"
	"log"
	"net/smtp"

	"github.com/siliconsoup/api/internal/models"
)

type Mailer struct {
	host    string
	port    string
	user    string
	pass    string
	from    string
	// Recipient for admin notifications (new orders, contact form)
	NotifyEmail string
}

func New(host, port, user, pass, notifyEmail string) *Mailer {
	return &Mailer{
		host:        host,
		port:        port,
		user:        user,
		pass:        pass,
		from:        user,
		NotifyEmail: notifyEmail,
	}
}

// Enabled returns false if SMTP is not configured — callers should check before firing goroutines
func (m *Mailer) Enabled() bool {
	return m.host != "" && m.user != "" && m.NotifyEmail != ""
}

func (m *Mailer) send(to, subject, body string) error {
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		m.from, to, subject, body)
	auth := smtp.PlainAuth("", m.user, m.pass, m.host)
	return smtp.SendMail(m.host+":"+m.port, auth, m.from, []string{to}, []byte(msg))
}

// SendOrderNotification emails Paul when a new order is captured
func (m *Mailer) SendOrderNotification(order models.Order, customerName, customerEmail, captureID string) {
	total := fmt.Sprintf("%.2f %s", float64(order.TotalPence)/100, order.Currency)
	subject := fmt.Sprintf("New order %s — %s", order.OrderNumber, total)
	body := fmt.Sprintf(`New order received on SiliconSoup.

Order:    %s
Customer: %s <%s>
Total:    %s
PayPal:   %s

Log in to the admin to view full details and mark as shipped.
https://siliconsoup.vercel.app/orders
`,
		order.OrderNumber,
		customerName, customerEmail,
		total,
		captureID,
	)

	if err := m.send(m.NotifyEmail, subject, body); err != nil {
		log.Printf("[mailer] SendOrderNotification: %v", err)
	} else {
		log.Printf("[mailer] order notification sent for %s", order.OrderNumber)
	}
}

// SendStatusUpdate emails the customer when their order status changes to shipped or delivered
func (m *Mailer) SendStatusUpdate(order models.Order) {
	var subject, body string

	tracking := ""
	if order.TrackingNumber != nil && *order.TrackingNumber != "" {
		tracking = fmt.Sprintf("\nTracking number: %s\n", *order.TrackingNumber)
	}

	switch order.Status {
	case "shipped":
		subject = fmt.Sprintf("Your order %s has shipped", order.OrderNumber)
		body = fmt.Sprintf(`Hi %s,

Great news — your SiliconSoup order has been shipped.

Order: %s
%s
If you have any questions, reply to this email or contact us at %s.

Thanks for your order!
SiliconSoup
`,
			order.CustomerName,
			order.OrderNumber,
			tracking,
			m.NotifyEmail,
		)

	case "delivered":
		subject = fmt.Sprintf("Your order %s has been delivered", order.OrderNumber)
		body = fmt.Sprintf(`Hi %s,

Your SiliconSoup order has been marked as delivered.

Order: %s

We hope everything arrived in great condition. If you have any issues, reply to this email or contact us at %s.

Thanks for your order!
SiliconSoup
`,
			order.CustomerName,
			order.OrderNumber,
			m.NotifyEmail,
		)

	default:
		return
	}

	if err := m.send(order.CustomerEmail, subject, body); err != nil {
		log.Printf("[mailer] SendStatusUpdate (%s) for %s: %v", order.Status, order.OrderNumber, err)
	} else {
		log.Printf("[mailer] status email (%s) sent for %s", order.Status, order.OrderNumber)
	}
}

// SendContactNotification emails Paul when a contact form is submitted
func (m *Mailer) SendContactNotification(name, fromEmail, message string) {
	subject := fmt.Sprintf("SiliconSoup contact form — %s", name)
	body := fmt.Sprintf(`New contact form submission.

Name:    %s
Email:   %s
Message:
%s
`,
		name, fromEmail, message,
	)

	if err := m.send(m.NotifyEmail, subject, body); err != nil {
		log.Printf("[mailer] SendContactNotification: %v", err)
	} else {
		log.Printf("[mailer] contact notification sent from %s", fromEmail)
	}
}

// SendContactAutoReply sends a confirmation to the person who submitted the contact form
func (m *Mailer) SendContactAutoReply(name, toEmail string) {
	subject := "Thanks for getting in touch — SiliconSoup"
	body := fmt.Sprintf(`Hi %s,

Thanks for contacting SiliconSoup. We've received your message and will get back to you shortly.

SiliconSoup
%s
`,
		name,
		m.NotifyEmail,
	)

	if err := m.send(toEmail, subject, body); err != nil {
		log.Printf("[mailer] SendContactAutoReply to %s: %v", toEmail, err)
	}
}

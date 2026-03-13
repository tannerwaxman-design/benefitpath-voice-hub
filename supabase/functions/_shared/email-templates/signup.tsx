/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for BenefitPath Voice AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://kpsilbmmedonhxjofixm.supabase.co/storage/v1/object/public/email-assets/logo.svg" alt="BenefitPath" height="40" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>Thanks for signing up for BenefitPath Voice AI!</Text>
        <Text style={text}>
          Please confirm your email address (<Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>Verify Email</Button>
        <Text style={footer}>If you didn't create an account, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', backgroundColor: '#ffffff', borderRadius: '8px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#4f46e5', textDecoration: 'underline' }
const button = { backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '30px 0 0' }

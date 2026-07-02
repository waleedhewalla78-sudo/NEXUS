'use client';

import React, { useState } from 'react';
import { provisionWhatsAppChannel, provisionSmsChannel } from '@/actions/omnichannel';
import { useWorkspaceStore } from '@/store/workspace';
import { MessageCircle, Phone, X, AlertCircle } from 'lucide-react';

interface ConnectChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectChannelDialog({ isOpen, onClose }: ConnectChannelDialogProps) {
  const { workspaceId } = useWorkspaceStore();
  const [channelType, setChannelType] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError('Workspace ID not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (channelType === 'whatsapp') {
        await provisionWhatsAppChannel(workspaceId, phoneNumber, metaToken);
      } else {
        await provisionSmsChannel(workspaceId, phoneNumber, twilioSid, twilioToken);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Connect Channel</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setChannelType('whatsapp')}
              className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all duration-200 ${
                channelType === 'whatsapp'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={() => setChannelType('sms')}
              className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all duration-200 ${
                channelType === 'sms'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Phone className="w-5 h-5" />
              Twilio SMS
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
              />
            </div>

            {channelType === 'whatsapp' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Meta Access Token</label>
                <input
                  type="password"
                  required
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  placeholder="EAAG..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Twilio Account SID</label>
                  <input
                    type="text"
                    required
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="AC..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Twilio Auth Token</label>
                  <input
                    type="password"
                    required
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="Your secure token..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                  />
                </div>
              </>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Connecting...' : `Connect ${channelType === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

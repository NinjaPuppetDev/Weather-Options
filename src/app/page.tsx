'use client';

import { useState } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ImprovedCreateOptionFlow from './components/ImprovedCreateOptionFlow';
import ImprovedMyOptions from './components/ImprovedMyOptions';
import LiquidityPool from './components/LiquidityPool';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'create' | 'my-options' | 'liquidity'>('home');

  const isHome = activeTab === 'home';

  return (
    <div style={{ minHeight: '100vh', background: '#f4ede0' }}>
      {!isHome && <Header activeTab={activeTab} setActiveTab={setActiveTab} />}

      {isHome ? (
        <LandingPage onStart={() => setActiveTab('create')} />
      ) : (
        <main style={{ padding: '2.5rem', maxWidth: '100%' }}>
          {activeTab === 'create'     && <ImprovedCreateOptionFlow />}
          {activeTab === 'my-options' && <ImprovedMyOptions />}
          {activeTab === 'liquidity'  && <LiquidityPool />}
        </main>
      )}
    </div>
  );
}
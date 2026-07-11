# Deriv Matches Bot XML Guide

## Overview
This guide explains how to use the Deriv Matches Bot XML files with Deriv's Bot Builder platform.

## Files Included
1. **deriv-matches-bot.xml** - Basic conservative Matches trading bot
2. **deriv-matches-bot-advanced.xml** - Advanced multi-asset trading bot with detailed configuration

## How to Import into Deriv Bot Builder

### Step 1: Access Deriv Bot Builder
- Log into your Deriv account
- Navigate to **Bot Trading** → **Bot Builder**
- Click **"Import"** or **"Load Strategy"**

### Step 2: Upload XML File
- Select one of the XML files:
  - Use `deriv-matches-bot.xml` for a simple setup
  - Use `deriv-matches-bot-advanced.xml` for advanced trading
- Click **"Upload"** or **"Paste XML"**
- The bot builder will parse and visualize your strategy

### Step 3: Configure Parameters
After importing, adjust these key parameters:

#### Account Settings
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Account Balance | 10,000 | Any | Your starting balance |
| Stake Amount | Auto (1-2%) | 0.01-10% | Risk per trade |
| Profit Target | 50% of stake | 0.5-5x | Daily profit goal |
| Loss Limit | 50% of stake | 0.5-2x | Daily loss threshold |

#### Trading Parameters
| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| Symbols | Multi-Asset | EUR/USD, GBP/USD, BTC, ETH, Synthetic | What to trade |
| Duration | 1-5 min | 1s to 1h | Contract duration |
| Prediction | Rise/Fall | Rise, Fall, Volatility | Trade direction |
| Max Trades | 100 | 1-500 | Max trades per session |

## Key Features

### 1. Conservative Risk Management (1-2% per trade)
- Stake amount = Account Balance × 1.5%
- Profit target = Stake × 0.5
- Stop loss = Stake × 0.5
- Automatic stop when daily target is hit

### 2. Multi-Asset Trading
Trades across:
- **Forex Pairs**: EUR/USD, GBP/USD, USD/JPY
- **Synthetic Indices**: Volatility 50, Volatility 100
- **Cryptocurrencies**: BTC/USD, ETH/USD

### 3. Smart Exit Conditions
- ✅ Exit when daily profit target reached
- ✅ Exit when daily loss limit hit
- ✅ Exit when max concurrent trades exceeded
- ✅ Automatic notifications on wins/losses

## Customization Guide

### Change Risk Per Trade
Modify the stake calculation:
```xml
<field name="NUM">0.01</field>  <!-- Change to 0.02 for 2% risk -->
```

### Add New Trading Symbol
Add to the symbols list in advanced.xml:
```xml
<symbol type="forex" name="frxAUDUSD">AUD/USD</symbol>
```

### Adjust Trade Duration
Modify duration in any trade block:
```xml
<field name="DURATION">5</field>           <!-- Minutes -->
<field name="DURATION_TYPE">m</field>      <!-- m=minutes, s=seconds, h=hours -->
```

### Change Profit/Loss Targets
```xml
<block type="math_number" id="10">
  <field name="NUM">0.5</field>  <!-- Change multiplier: 0.5 = 50%, 1.0 = 100% -->
</block>
```

## Trading Strategies Explained

### Strategy 1: Trend Following (Basic Bot)
- Enters on price movement
- Uses simple rise/fall predictions
- Best for trending markets
- Duration: 1 minute

### Strategy 2: Multi-Asset Diversification (Advanced Bot)
- Trades multiple correlated and uncorrelated assets
- Reduces concentration risk
- Spreads across Forex, Synthetics, and Crypto
- Duration: 2-5 minutes per trade

### Strategy 3: Volatility Trading (Advanced Bot)
- Enters during high volatility periods
- Uses synthetic indices (R_50, R_100)
- Profits from price swings
- Duration: 2-3 minutes

## Safety Guidelines

### ⚠️ Important Rules
1. **Start Small**: Begin with 1-2% risk per trade
2. **Test First**: Use Demo account to test before live trading
3. **Monitor**: Watch first few trades to ensure bot works as expected
4. **Set Limits**: Never exceed daily loss limits set in the bot
5. **Adjust Often**: Monitor performance and adjust parameters weekly

### Recommended Daily Targets
| Account Size | Daily Profit Target | Max Daily Loss |
|---|---|---|
| $1,000 | $20-50 | $20-30 |
| $5,000 | $75-150 | $100-150 |
| $10,000 | $150-300 | $200-300 |

## Troubleshooting

### Bot Not Executing Trades
- Check if markets are open for selected symbols
- Verify account has sufficient balance
- Ensure bot duration matches available contract times
- Check internet connection stability

### Trades Losing Consistently
- Reduce stake amount by 25-50%
- Switch to different symbol with better trend
- Increase trade duration
- Review market conditions (avoid choppy/range-bound)

### Bot Stops Unexpectedly
- Check daily loss limit hasn't been hit
- Verify maximum trades limit not exceeded
- Ensure account balance hasn't depleted
- Review error logs in Bot Builder

## Performance Monitoring

Track these metrics daily:
- **Win Rate**: Trades Won / Total Trades × 100%
- **Profit Factor**: Gross Profit / Gross Loss
- **Sharpe Ratio**: (Daily Return - Risk-Free Rate) / Return Volatility
- **Max Drawdown**: Largest loss from peak

**Target Performance**:
- Win Rate: 55-65%
- Profit Factor: 1.5-2.0
- Max Drawdown: < 20% of account

## Advanced Modifications

### 1. Add Moving Average Crossover Logic
Modify prediction block to include MA conditions

### 2. Implement Martingale (Increase After Loss)
Double stake after loss (use cautiously!)

### 3. Add Time-Based Restrictions
Only trade during specific hours (e.g., 08:00-14:00 GMT)

### 4. Implement Correlation Checks
Skip trades if correlated pairs moving opposite direction

## Exporting and Backup

Always backup your XML:
```bash
# Save to computer
cp deriv-matches-bot-advanced.xml ~/backups/bot-backup-$(date +%Y%m%d).xml

# Or export from Deriv Bot Builder → Download Strategy
```

## Support and Updates

For Deriv Bot Builder help:
- Visit: https://deriv.com/help
- Community: https://reddit.com/r/Deriv
- Documentation: https://docs.deriv.com

## Next Steps

1. ✅ Download both XML files
2. ✅ Create a Deriv demo account (if not exists)
3. ✅ Import `deriv-matches-bot.xml` first
4. ✅ Test on demo for 24-48 hours
5. ✅ Adjust parameters based on performance
6. ✅ Upgrade to `deriv-matches-bot-advanced.xml` when comfortable
7. ✅ Start live trading with 1-2% risk per trade

## Disclaimer

⚠️ **Trading involves risk**. Past performance doesn't guarantee future results. Always:
- Use a demo account first
- Start with small positions
- Never risk more than you can afford to lose
- Understand all trading risks before proceeding

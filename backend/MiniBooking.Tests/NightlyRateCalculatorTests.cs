using MiniBooking.Domain.Bookings;
namespace MiniBooking.Tests;
public sealed class NightlyRateCalculatorTests
{
    private readonly NightlyRateCalculator _calculator = new();
    private static readonly DateOnly Aug1 = new(2026, 8, 1);
    private static readonly DateOnly Aug15 = new(2026, 8, 15);
    [Fact] public void SingleRate_SumsEachOccupiedNight() => Assert.Equal(6000m, Calculate(10, 12, new RatePeriod(Aug1, 3000m)));
    [Fact] public void RateChangeDuringStay_AppliesRatePerNight() => Assert.Equal(13000m, Calculate(13, 17, new(Aug1, 3000m), new(Aug15, 3500m)));
    [Fact] public void RateChangeOnCheckIn_AppliesNewRate() => Assert.Equal(7000m, Calculate(15, 17, new(Aug1, 3000m), new(Aug15, 3500m)));
    [Fact] public void RateChangeOnCheckout_DoesNotApplyNewRate() => Assert.Equal(6000m, Calculate(13, 15, new(Aug1, 3000m), new(Aug15, 3500m)));
    [Fact] public void MultipleRateChanges_AppliesAllPeriods() => Assert.Equal(12500m, Calculate(12, 17, new(Aug1, 2000m), new(new(2026, 8, 13), 2500m), new(new(2026, 8, 16), 3000m)));
    [Fact] public void MissingRate_ThrowsMeaningfulException()
    {
        var exception = Assert.Throws<MissingRateException>(() => Calculate(13, 17, new RatePeriod(Aug15, 3500m)));
        Assert.Equal(new DateOnly(2026, 8, 13), exception.Night);
    }
    [Fact] public void InvalidRange_IsRejected() => Assert.Throws<ArgumentException>(() => _calculator.Calculate(Aug15, Aug15, []));
    private decimal Calculate(int checkInDay, int checkOutDay, params RatePeriod[] rates) => _calculator.Calculate(new(2026, 8, checkInDay), new(2026, 8, checkOutDay), rates);
}

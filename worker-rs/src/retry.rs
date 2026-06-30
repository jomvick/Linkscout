use std::time::Duration;
use tokio::time::sleep;

/// Outcome of a single attempt inside a retry loop.
pub enum RetryOutcome<T, E> {
    /// Success — return the value immediately.
    Ok(T),
    /// Retryable error — will be retried up to `max_attempts`.
    Retry(E),
    /// Permanent error — stop retrying and return immediately.
    Fail(E),
}

/// Run an async operation with exponential backoff.
///
/// - `max_attempts` includes the first attempt (e.g. 3 = 1 try + 2 retries).
/// - `base_delay` is the delay before the first retry; it doubles each attempt.
/// - Delays are capped at 8 seconds to avoid excessive waits.
pub async fn with_retry<T, E, F, Fut>(
    operation: F,
    max_attempts: u32,
    base_delay: Duration,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = RetryOutcome<T, E>>,
{
    let mut attempt = 0u32;
    loop {
        attempt += 1;
        match operation().await {
            RetryOutcome::Ok(value) => return Ok(value),
            RetryOutcome::Fail(err) => return Err(err),
            RetryOutcome::Retry(err) if attempt >= max_attempts => return Err(err),
            RetryOutcome::Retry(_) => {
                let delay = base_delay * 2_u32.pow(attempt - 1);
                sleep(delay.min(Duration::from_secs(8))).await;
            }
        }
    }
}

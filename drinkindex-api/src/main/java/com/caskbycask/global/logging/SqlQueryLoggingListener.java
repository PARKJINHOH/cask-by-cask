package com.caskbycask.global.logging;

import com.caskbycask.global.auth.security.CustomUserDetails;
import lombok.extern.slf4j.Slf4j;
import net.ttddyy.dsproxy.ExecutionInfo;
import net.ttddyy.dsproxy.QueryInfo;
import net.ttddyy.dsproxy.listener.QueryExecutionListener;
import net.ttddyy.dsproxy.proxy.ParameterSetOperation;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.regex.Matcher;

@Slf4j
public class SqlQueryLoggingListener implements QueryExecutionListener {

    @Override
    public void beforeQuery(ExecutionInfo execInfo, List<QueryInfo> queryInfoList) {}

    @Override
    public void afterQuery(ExecutionInfo execInfo, List<QueryInfo> queryInfoList) {
        String userPrefix = resolveUserPrefix();
        String caller = resolveCaller();
        for (QueryInfo qi : queryInfoList) {
            String sql = buildInlineSql(qi);
            log.debug("{}[{}] SQL: {}", userPrefix, caller, sql);
        }
    }

    private String resolveCaller() {
        for (StackTraceElement el : Thread.currentThread().getStackTrace()) {
            String cls = el.getClassName();
            if (cls.startsWith("com.caskbycask") && !cls.contains("Logging")) {
                String simpleName = cls.substring(cls.lastIndexOf('.') + 1);
                return simpleName + "." + el.getMethodName();
            }
        }
        return "unknown";
    }

    private String resolveUserPrefix() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return "[userId=" + ud.getUserId() + "] ";
        }
        return "";
    }

    private String buildInlineSql(QueryInfo qi) {
        String query = qi.getQuery();
        List<List<ParameterSetOperation>> paramsList = qi.getParametersList();
        if (paramsList.isEmpty()) return query;

        for (ParameterSetOperation op : paramsList.get(0)) {
            Object[] args = op.getArgs();
            if (args.length >= 2) {
                Object value = args[1];
                String strVal = (value == null) ? "NULL" : "'" + value + "'";
                query = query.replaceFirst("\\?", Matcher.quoteReplacement(strVal));
            }
        }
        return query;
    }
}

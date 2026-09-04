"""
Standard DRF PageNumberPagination class for ApexPOS API.
Provides 50 items/page by default, supports full search over millions of records,
and allows explicit bypass via ?all=true or ?no_page=true for dropdown options.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500

    def paginate_queryset(self, queryset, request, view=None):
        # Allow disabling pagination explicitly for dropdowns or full exports
        all_param = request.query_params.get("all")
        no_page_param = request.query_params.get("no_page")
        paginate_param = request.query_params.get("paginate")

        if str(all_param).lower() in ["true", "1", "yes"]:
            return None
        if str(no_page_param).lower() in ["true", "1", "yes"]:
            return None
        if str(paginate_param).lower() in ["false", "0", "no"]:
            return None

        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })
